import logging
import os
# from Booking_Voice_Agent.src import fsm
import certifi
import ssl
import asyncio
import time
# Fix SSL certificate verification on macOS
os.environ["SSL_CERT_FILE"] = certifi.where()
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl._create_default_https_context = lambda: ssl_context
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Annotated

import httpx
import re
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    inference,
    room_io,
    AgentStateChangedEvent, UserStateChangedEvent, FunctionToolsExecutedEvent
)
from livekit.plugins import noise_cancellation, silero, openai,groq,resemble,sarvam

from livekit.plugins.turn_detector.multilingual import MultilingualModel
from otp_service import generate_otp, hash_otp, send_otp_email
from fsm import FSM,State


logger = logging.getLogger("agent-Salon_Agent")
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logging.getLogger("fsm").setLevel(logging.DEBUG)
_fsm_logger = logging.getLogger("fsm")
if not _fsm_logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [FSM] %(levelname)s: %(message)s", "%H:%M:%S"))
    _fsm_logger.addHandler(_h)
_fsm_logger.propagate = False

load_dotenv(".env.local")

# Cal.com API Configuration
CAL_COM_API_KEY = os.getenv("CAL_COM_API_KEY")
CAL_COM_API_URL = "https://api.cal.com/v2"
CAL_USERNAME = os.getenv("CAL_USERNAME")

# Phone-to-Email mapping (loaded from env)
import json
_phone_map_raw = os.getenv("PHONE_EMAIL_MAP", "{}")
try:
    PHONE_EMAIL_MAP = json.loads(_phone_map_raw)
except json.JSONDecodeError:
    print("[WARNING] Failed to parse PHONE_EMAIL_MAP from env, using empty map")
    PHONE_EMAIL_MAP = {}
DEFAULT_EMAIL = os.getenv("DEFAULT_EMAIL", "guest@voice.ai")


def lookup_email_by_phone(phone: str) -> str:
    """Look up email mapped to a phone number. Falls back to DEFAULT_EMAIL."""
    if not phone:
        logger.warning("lookup_email_by_phone called with empty phone, using default")
        return DEFAULT_EMAIL
    # Extract last 10 digits for matching (strip +91 or any prefix)
    digits = "".join(filter(str.isdigit, phone))
    last_10 = digits[-10:] if len(digits) >= 10 else digits
    email = PHONE_EMAIL_MAP.get(last_10, DEFAULT_EMAIL)
    logger.info(f"Phone lookup: {phone} -> digits={last_10} -> {email}")
    return email


async def fetch_project_config(project_id: str) -> dict | None:
    """
    Fetch project configuration from the Next.js frontend's internal API.
    Called once per session start, before the agent/session is created.

    Returns the full project dict (agentName, businessName, industry,
    greeting, language, voiceId, services, schedule) or None on failure.
    """
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000").rstrip("/")
    secret = os.getenv("VOICE_AGENT_SECRET", "")

    if not project_id:
        logger.warning("fetch_project_config called with empty project_id")
        return None

    url = f"{backend_url}/api/internal/projects/{project_id}"
    headers = {"Authorization": f"Bearer {secret}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)

        if response.status_code == 200:
            config = response.json()
            logger.info(
                f"✅ Project config fetched — "
                f"agentName={config.get('agentName')!r}, "
                f"business={config.get('businessName')!r}, "
                f"industry={config.get('industry')!r}"
            )
            return config

        if response.status_code == 401:
            logger.error(
                "fetch_project_config: Unauthorized. "
                "Check that VOICE_AGENT_SECRET matches the frontend .env.local"
            )
            return None

        if response.status_code == 404:
            logger.warning(f"fetch_project_config: Project {project_id!r} not found in database")
            return None

        logger.error(
            f"fetch_project_config: Unexpected HTTP {response.status_code} "
            f"from {url} — {response.text[:300]}"
        )
        return None

    except httpx.ConnectError:
        logger.error(
            f"fetch_project_config: Could not connect to backend at {backend_url}. "
            "Make sure the Next.js server is running before starting the agent."
        )
        return None
    except Exception as e:
        logger.error(f"fetch_project_config: Unexpected error — {e}")
        return None


# Cache for event types (refreshed periodically)
EVENT_TYPES_CACHE = {
    "data": [],
    "last_updated": None,
    "ttl_seconds": 300  # Cache for 5 minutes
}


async def fetch_event_types(force_refresh=False):
    """Fetch all event types from Cal.com V1 API and cache them."""
    global EVENT_TYPES_CACHE
    
    now = datetime.now()
    cache_valid = (
        EVENT_TYPES_CACHE["last_updated"] is not None and
        (now - EVENT_TYPES_CACHE["last_updated"]).total_seconds() < EVENT_TYPES_CACHE["ttl_seconds"]
    )
    
    if not force_refresh and cache_valid:
        return EVENT_TYPES_CACHE["data"]
    
    try:
        async with httpx.AsyncClient() as client:
            # Use V1 endpoint - this is the standard way to get event types
            res = await client.get(
                "https://api.cal.com/v1/event-types",
                params={
                    "apiKey": CAL_COM_API_KEY,
                },
                timeout=10.0,
            )
            
            if res.status_code == 200:
                response_data = res.json()
                # V1 returns {event_types: [...]}
                event_types = response_data.get("event_types", [])
                
                # Format the data consistently
                formatted_types = []
                for et in event_types:
                    formatted_types.append({
                        "id": et.get("id"),
                        "title": et.get("title"),
                        "slug": et.get("slug"),
                        "lengthInMinutes": et.get("length", 30),  # V1 uses "length"
                        "description": et.get("description", ""),   # ← ADD THIS ONE LINE
                    })
                
                EVENT_TYPES_CACHE["data"] = formatted_types
                EVENT_TYPES_CACHE["last_updated"] = now
                logger.info(f"Fetched {len(formatted_types)} event types from Cal.com")
                return formatted_types
            else:
                logger.error(f"Failed to fetch event types: {res.status_code} - {res.text}")
                return EVENT_TYPES_CACHE["data"]
    except Exception as e:
        logger.error(f"Error fetching event types: {e}")
        return EVENT_TYPES_CACHE["data"]


def get_all_services(active_services: list = None):
    """Get all available services from cached event types."""
    event_types = active_services if active_services is not None else EVENT_TYPES_CACHE["data"]
    services = []
    for et in event_types:
        service_info = {
            "id": et.get("id"),
            "title": et.get("title"),
            "slug": et.get("slug"),
            "duration": et.get("lengthInMinutes", 30),
            "description": et.get("description", ""),   # ← ADD THIS ONE LINE
        }
        services.append(service_info)
    
    return services
def group_services_by_category(active_services: list = None) -> dict[str, list[dict]]:
    """
    Groups services by their category prefix.
    Cal.com titles follow the pattern "Category - Style".
    Returns: {"Hair": [service1, service2], "Beard": [...], ...}
    """
    services = get_all_services(active_services)
    categories: dict[str, list[dict]] = {}
    
    for svc in services:
        title = svc.get("title", "")
        if " - " in title:
            category, style = title.split(" - ", 1)
            category = category.strip()
            svc["style"] = style.strip()  # attach the style name to the service
        else:
            category = title.strip()
            svc["style"] = None  # no subcategory
        
        categories.setdefault(category, []).append(svc)
    
    return categories


def find_category_by_name(category_name: str, active_services: list = None) -> list[dict] | None:
    """
    Given a broad category like 'hair' or 'beard', returns all matching sub-services.
    Returns None if only one service matches (no sub-selection needed).
    """
    categories = group_services_by_category(active_services)
    name_lower = category_name.lower().strip()
    
    for cat_key, services in categories.items():
        if name_lower in cat_key.lower() or cat_key.lower() in name_lower:
            return services  # could be 1 or many
    
    return None


def find_service_by_name(service_name: str, active_services: list = None):
    """Find a service by matching the name (case-insensitive, partial match)."""
    services = get_all_services(active_services)
    service_lower = service_name.lower().strip()
    
    # Try exact match first
    for service in services:
        if service["title"].lower() == service_lower or service["slug"].lower() == service_lower:
            return service
    
    # Try partial match
    for service in services:
        if service_lower in service["title"].lower() or service_lower in service["slug"].lower():
            return service
        if service["title"].lower() in service_lower or service["slug"].lower() in service_lower:
            return service
    
    return None

def find_combo_service(primary_service: str, addon_service: str, active_services: list = None):
    """Look for a combo event type covering both services."""
    services = get_all_services(active_services)
    primary_lower = primary_service.lower().strip()
    addon_lower = addon_service.lower().strip()

    def keywords(s):
        stop = {"and", "with", "a", "the", "&", "+"}
        return [w for w in s.split() if w not in stop and len(w) > 1]

    primary_kws = keywords(primary_lower)
    addon_kws = keywords(addon_lower)
    best = None
    best_score = 0

    for svc in services:
        combined = svc["title"].lower() + " " + svc["slug"].lower()
        hits_primary = any(kw in combined for kw in primary_kws)
        hits_addon = any(kw in combined for kw in addon_kws)
        score = sum(1 for kw in primary_kws if kw in combined) + \
                sum(1 for kw in addon_kws if kw in combined)
        if hits_primary and hits_addon and score > best_score:
            best_score = score
            best = svc

    return best

def find_upsell_target(booked_service: str, exclude: str | None = None, active_services: list = None) -> str | None:
    """
    Dynamically find the best upsell target based on what was booked.
    - Individual service → find a combo that contains its keyword
    - Combo → find a different combo with least keyword overlap
    exclude: title already suggested in upsell #1, to avoid repeating it
    """
    services = get_all_services(active_services)
    booked_lower = booked_service.lower().strip()
    is_combo = booked_lower.startswith("combo")

    stop = {"and", "with", "a", "the", "&", "+", "-", "combo", "hair", "full"}
    booked_keywords = [
        w for w in re.split(r"[\s\-&+]+", booked_lower)
        if w not in stop and len(w) > 2
    ]

    combos = [s for s in services if s["title"].lower().startswith("combo")]

    if not is_combo:
        # Individual → find combo that contains this service's keyword
        best = None
        best_score = 0
        for combo in combos:
            combo_lower = combo["title"].lower()
            if exclude and combo["title"].lower() == exclude.lower():
                continue
            score = sum(1 for kw in booked_keywords if kw in combo_lower)
            if score > best_score:
                best_score = score
                best = combo
        return best["title"] if best else None

    else:
        # Combo → find a different combo with least keyword overlap
        best = None
        best_score = -999
        for combo in combos:
            combo_lower = combo["title"].lower()
            if combo_lower == booked_lower:
                continue
            if exclude and combo["title"].lower() == exclude.lower():
                continue
            overlap = sum(1 for kw in booked_keywords if kw in combo_lower)
            score = -overlap  # lower overlap = more different = better upsell #2
            if score > best_score:
                best_score = score
                best = combo
        return best["title"] if best else None


def filter_services_by_project(agent_config: dict | None) -> list:
    """
    Returns a filtered copy of the master cache for this session.
    NEVER mutates EVENT_TYPES_CACHE — concurrent sessions are safe.
    """
    cached = list(EVENT_TYPES_CACHE["data"])  # shallow copy, never touch original

    if not agent_config:
        return cached

    project_services: list = agent_config.get("services", []) or []
    if not project_services:
        logger.info("📂 Phase 3: No services configured — using all Cal.com services")
        return cached

    project_names: set[str] = set()
    for svc in project_services:
        name = svc.get("name", "") if isinstance(svc, dict) else str(svc)
        if name:
            project_names.add(name.strip().lower())

    if not project_names:
        return cached

    logger.info(f"📂 Phase 3: Filtering to project services: {project_names}")

    filtered = [
        entry for entry in cached
        if any(
            p in (entry.get("title") or "").lower() or
            (entry.get("title") or "").lower() in p or
            p in (entry.get("slug") or "").lower() or
            (entry.get("slug") or "").lower() in p
            for p in project_names
        )
    ]

    if filtered:
        logger.info(f"✅ Phase 3: Narrowed to {len(filtered)}/{len(cached)} services: {[e['title'] for e in filtered]}")
        return filtered

    logger.warning(f"⚠️ Phase 3: Filter matched 0 services for {project_names} — using full list")
    return cached

def normalize_phone(phone: str) -> str:
    # Strip everything non-digit (handles hyphens, commas, spaces from STT)
    digits = "".join(filter(str.isdigit, phone))
    # Accept 10 digits (local), 11 digits (0XXXXXXXXXX), or 12 digits (91XXXXXXXXXX)
    if len(digits) >= 12:
        return f"+{digits[-12:]}"  # already has country code
    return f"+91{digits[-10:]}"


def extract_booking_phone(booking: dict) -> str | None:
    for attendee in booking.get("attendees", []):
        phone = attendee.get("phoneNumber")
        if phone:
            return phone

    bfr = booking.get("bookingFieldsResponses", {})
    phone = bfr.get("attendeePhoneNumber")
    if phone:
        return phone

    meta = booking.get("metadata", {})
    return meta.get("guest_phone")


def parse_datetime(date_str: str, time_str: str, timezone: str = "Asia/Kolkata") -> str:
    """
    Parses date and time strings using standard library.
    Returns ISO 8601 string: 'YYYY-MM-DDTHH:MM:SS.000Z' in Asia/Kolkata.
    """
    date_clean = date_str.strip().lower()
    time_clean = time_str.strip().lower()
    
    current_tz = ZoneInfo(timezone)
    now_in_tz = datetime.now(current_tz)
    
    target_date = now_in_tz
    if "tomorrow" in date_clean:
        target_date = target_date + timedelta(days=1)
    elif "day after" in date_clean or "day after tomorrow" in date_clean or "day-after-tomorrow" in date_clean:
        target_date = target_date + timedelta(days=2)
    elif "today" in date_clean:
        pass 
    else:
        m = re.fullmatch(r"(\d{1,2})(st|nd|rd|th)?", date_clean)
        if m:
            day_num = int(m.group(1))
            year = now_in_tz.year
            month = now_in_tz.month
            
            try:
                candidate = datetime(year, month, day_num, tzinfo=current_tz)
                
                if candidate.date() < now_in_tz.date():
                    month += 1
                    if month > 12:
                        month = 1
                        year += 1
                    candidate = datetime(year, month, day_num, tzinfo=current_tz)
                
                target_date = candidate
                
            except ValueError:
                month += 1
                if month > 12:
                    month = 1
                    year += 1
                try:
                    candidate = datetime(year, month, day_num, tzinfo=current_tz)
                    target_date = candidate
                except ValueError:
                    pass
        else:
            has_explicit_year = bool(re.search(r"\b\d{4}\b", date_str))
            
            # Added support for %d %b (e.g. 23 dec) and %d %B types
            for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%B %d", "%b %d", "%d %b", "%d %B"]:
                try:
                    parsed = datetime.strptime(date_clean.replace("th", "").replace("st", "").replace("nd", "").replace("rd", ""), fmt)
                    
                    if has_explicit_year:
                        parsed = parsed.replace(tzinfo=current_tz)
                        # Sanity check: if user says 2023 but it's 2025, fix it
                        if parsed.year < now_in_tz.year:
                             parsed = parsed.replace(year=now_in_tz.year)
                    else:
                        parsed = parsed.replace(year=now_in_tz.year, tzinfo=current_tz)

                    # If date is in the past, assume next year (unless explicit valid year)
                    if parsed.date() < now_in_tz.date():
                        parsed = parsed.replace(year=now_in_tz.year + 1)
                    
                    target_date = parsed
                    break
                except ValueError:
                    continue

    target_time = None
    try:
        target_time = datetime.strptime(time_clean, "%H:%M").time()
    except ValueError:
        try:
            time_clean = time_clean.replace(".", "").upper()
            if ":" not in time_clean: 
                parts = time_clean.split()
                if len(parts) == 2:
                    time_clean = f"{parts[0]}:00 {parts[1]}"
            target_time = datetime.strptime(time_clean, "%I:%M %p").time()
        except ValueError:
            pass
            
    if not target_time:
        if ":" in time_clean:
            h, m = time_clean.split(":")[:2]
            target_time = now_in_tz.replace(hour=int(h), minute=int(m)).time()

    if target_time:
        final_dt_aware = datetime.combine(target_date.date(), target_time, tzinfo=current_tz)
        final_dt_utc = final_dt_aware.astimezone(ZoneInfo("UTC"))
        return final_dt_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    raise ValueError(f"Could not parse time: {time_str}")

def format_spoken_date(dt: datetime) -> str:
    """Formats a date object into natural spoken text (e.g. 'January 2nd')."""
    day = dt.day
    suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return dt.strftime(f"%B {day}{suffix}")


class SilenceMonitor:
    """Monitors user silence and prompts if no response after timeout."""
    
    def __init__(self, session, timeout_seconds: float = 30.0):
        self.session = session
        self.timeout_seconds = timeout_seconds
        self._timer_task = None
        self._waiting_for_user = False
        self._prompt_count = 0
        self._max_prompts = 3
        
    def start_waiting(self):
        """Start monitoring for user silence."""
        if self._prompt_count >= self._max_prompts:
            logger.debug("Max silence prompts reached")
            return
            
        self._waiting_for_user = True
        
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        
        self._timer_task = asyncio.create_task(self._silence_timer())
        logger.debug(f"Started silence monitoring ({self.timeout_seconds}s)")
    
    def stop_waiting(self):
        """Stop monitoring."""
        self._waiting_for_user = False
        self._prompt_count = 0
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            logger.debug("Stopped silence monitoring")

    def cancel(self):
        """Permanently shut down the monitor on disconnect."""
        self._waiting_for_user = False
        self._prompt_count = self._max_prompts  # prevent any future prompts
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        logger.debug("SilenceMonitor permanently cancelled")
    
    async def _silence_timer(self):
        """Timer that triggers prompt after timeout."""
        try:
            await asyncio.sleep(self.timeout_seconds)
            
            if self._waiting_for_user:
                self._prompt_count += 1
                logger.info(f"User silence detected, prompting ({self._prompt_count}/{self._max_prompts})")
                
                fsm = getattr(self.session, 'fsm', None)
                prompt = fsm.get_silence_prompt() if fsm else "Hello...? Are you still there?"
                
                await self.session.say(prompt, allow_interruptions=True)
                
                if self._prompt_count < self._max_prompts:
                    self._timer_task = asyncio.create_task(self._silence_timer())
                else:
                    logger.info("Max prompts reached")
                    await self.session.say(
                        "I'll be here when you need me. Feel free to call back anytime!",
                        allow_interruptions=False
                    )
                
        except asyncio.CancelledError:
            pass


def setup_silence_detection(session, silence_monitor):
    """Setup event listeners for silence detection."""
    
    logger.info("Setting up silence detection")
    
    @session.on("agent_state_changed")
    def on_agent_state(event: AgentStateChangedEvent):
        # ✅ CRITICAL: Use event.new_state (not event.state)
        # Agent states: "initializing", "idle", "listening", "thinking", "speaking"
        logger.debug(f"Agent: {event.old_state} -> {event.new_state}")
        
        if event.new_state == "listening":
            silence_monitor.start_waiting()
        else:
            silence_monitor.stop_waiting()
    
    @session.on("user_state_changed") 
    def on_user_state(event: UserStateChangedEvent):
        # ✅ CRITICAL: Use event.new_state (not event.state)
        # User states: "speaking", "listening", "away"
        logger.debug(f"User: {event.old_state} -> {event.new_state}")
        
        if event.new_state == "speaking":
            silence_monitor.stop_waiting()


class Assistant(Agent):
    def __init__(self, agent_config: dict | None = None) -> None:
        # Store the project config for this session (used in Phase 2 for dynamic identity)
        self._agent_config = agent_config or {}

        if self._agent_config:
            logger.info(
                f"🤖 Assistant initialised with project config — "
                f"agentName={self._agent_config.get('agentName')!r}, "
                f"business={self._agent_config.get('businessName')!r}"
            )
        else:
            logger.info("🤖 Assistant initialised with DEFAULT config (no project config received)")

        # ── Phase 2: Build dynamic identity from project config ────────────
        agent_name    = self._agent_config.get("agentName")    or "Shubh Patel"
        business_name = self._agent_config.get("businessName") or "Luminox Salons"
        industry      = self._agent_config.get("industry")     or "salon"

        # Greeting used by my_agent().session.say() — stored separately so
        # my_agent() can read it back from the Assistant instance.
        self._greeting = (
            self._agent_config.get("greeting")
            or f"Hello! I'm {agent_name} from {business_name}. How can I help you today?"
        )

        logger.info(
            f"🎭 Dynamic identity — name={agent_name!r}, "
            f"business={business_name!r}, industry={industry!r}, "
            f"greeting={self._greeting!r}"
        )

        # ── Build dynamic instructions based on available services ──────────
        services = get_all_services(EVENT_TYPES_CACHE["data"])
        service_list = "\n".join([f"- **{s['title']}**: {s['duration']} min"
    + (f" | {s['description']}" if s.get('description') else "")
    for s in services])

        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        today_str = now.strftime("%A, %d %B %Y")

        instructions = f"""
You are {agent_name}, the warm and friendly voice receptionist at {business_name}. You book {industry} appointments over a voice call. You genuinely care about the people you talk to — not just booking them in, but making them feel welcomed and excited about their visit.

Today: {today_str} | Timezone: Asia/Kolkata

## WHO YOU ARE
You're not a bot. You're a real person who happens to love their job. You remember that the person on the other end of the call is probably a little busy, maybe a little nervous, and just wants things to go smoothly. You make that happen — cheerfully, naturally, without any fuss.

You have a warm Indian English accent and a relaxed, friendly style. You speak the way a receptionist at a really good salon would — confident, caring, and a little chatty in the best way.

## LANGUAGE & DETECTION
- Auto-detect user's language. ALWAYS reply in the same language they last used — no exceptions.
- Tool results = internal notes. NEVER read them aloud. Rephrase naturally in the user's language.
- Tags [INTERNAL] and [SYSTEM NOTE] = never speak, only act on them.
- Tool return values that start with [INTERNAL] are instructions — translate the ACTION into the user's language, never the words themselves.
- When in Hindi/Hinglish mode, ALL spoken responses must be in Hindi/Hinglish — even after tool calls.
- NEVER slip back into English mid-conversation if user is speaking Hindi/Hinglish.

**English**: normal digits and time ("5:00 PM", "30 min").
**Hindi/Hinglish**: casual everyday speech. Keep English words for Booking, Service, Time, Date, Phone, Available, Confirm. Never use formal Hindi (uplabdh, pushti, kripya).
- CRITICAL FOR TTS: NEVER output Devanagari script (e.g. हिंदी, आपका). Always write Hindi in Roman letters only.
- Wrong: "आपकी appointment confirm हो गई" → Right: "Aapki appointment confirm ho gayi!"

**Hindi/Hinglish number rules — follow exactly:**
- TIME → keep as digits, say AM/PM in English: "3 PM", "10 AM", "saade teen PM" is fine too
- DATES → say naturally: "kal", "parso", "mangalwar", "25 tarik" — never say "2025-01-25"
- PRICES → Hindi words or digits both fine: "do sau rupaye" or "200 rupaye"
- PHONE digits → when reading back a number, spell each digit in Hindi: "nau aath saat chhe paanch..."
- COUNTS/SLOTS → Hindi words: "do slot hain", "teen options hain", "ek minute"
- DURATION → Hindi: "bees minute lagenge", "aadha ghanta"
**All modes**: Say dates as "January 2nd" not "2024-01-02". Phone numbers: group last 10 digits as 3-3-4 with spaces ("987 654 3210"), drop +91 prefix.

## TONE — SOUND LIKE A REAL HUMAN WHO LOVES THEIR JOB
- Short, warm replies (1-3 sentences). Never more than 3 sentences at a time.
- Use natural fillers and reactions: "Perfect!", "Great choice!", "Okay let me check...", "Hmm give me a second...", "Sounds good!", "Love that!", "Absolutely!"
- React to their service choice with genuine enthusiasm. A fade/taper? "Oh that's a great look." Kids haircut? "Aw, bringing in the little one!"
- When checking availability say something like "Let me peek at the calendar real quick..." not "I am checking availability."
- When booking is confirmed, sound genuinely happy for them: "You're all set! Super excited for you to come in."
- If something goes wrong, be empathetic: "Oh no, that slot just got taken — but don't worry, I've got another great time for you."

BANNED words: assist, process, initiate, execute, validate, ensure, acknowledge, apologize, commencing, utilize, provide, query, detected, certainly, absolutely (unless mid-sentence naturally).
BANNED phrases: "How can I assist you?", "Please provide", "I have successfully", "As an AI", "Upon checking", "I understand your concern", "Is there anything else I can help you with?"

## SERVICES (internal only — do NOT list aloud unless asked)
{service_list if service_list else "Loaded dynamically from Cal.com"}

- Only book services from the list above. Max 7 days ahead.
- If asked for an unavailable service: "Ooh we don't have that just yet — but we're working on it! In the meantime, [closest alternative] is really popular. Want to try that?"
- If user asks "what services do you have?" → call `list_available_services`, then say CATEGORY NAMES only in a natural way. Example: "So we do hair, beard stuff, and styling — what are you thinking?"

## BOOKING FLOW
Collect in this order. Skip what user already gave. Ask ONE thing at a time. Never sound like you're filling out a form.

1. **Service** → call `input_service` with whatever the user said.
   - If multiple styles exist → ask naturally: "Oh we've got a few options for that — there's [Style A] and [Style B]. Which vibe are you going for?"
   - If confirmed → make UPSELL #1 (see below), then ask about date casually.
   - NEVER ask for date/time until a specific service is confirmed.
   - After style picked → call `input_service` again with the specific name.

2. **Date** → Ask casually: "Any day in mind, or want me to see what's open?"   
   - If user gives a date → call `get_availability` immediately.
   - No date → call `check_available_days`, present options warmly: "We've got good slots on Tuesday and Thursday — does either work for you?"

3. **Time** → Present slots like a human would: "Morning's pretty open — we've got 10 and 11. Or there's a 3 PM slot in the afternoon. What works?"
   - Specific time: check if available. If not: "Oh that one just filled up — but 4 PM is free right after, would that work?"

4. **Phone** → Ask warmly: "Just need your number to lock this in!" Call `input_phone` the moment you hear 10+ digits. Never ask them to reformat.

5. **OTP** → "I've just shot a verification code to your email — go ahead and say the 6 digits whenever you're ready!" Call `verify_otp`. Resend → call `resend_otp` with "Of course, sending a fresh one right now!"

6. **Confirm** → Sound excited for them: "Okay so just to confirm — [Service] on [Date] at [Time]. Should I go ahead and lock that in?" Call `create_booking` immediately on yes.

7. **After booking** → Celebrate it! "You're all booked! See you on [date] at [time] — we're looking forward to having you in!" Then make UPSELL #2.

## UPSELLING — FEEL NATURAL, NOT PUSHY
Max 2 suggestions per call. Never feel like a sales pitch. Sound like a friend giving a tip.

**UPSELL #1** — Right after service confirmed, before date:
- Combo exists: "Oh by the way — a lot of people pair that with [addon] and we actually have a combo for both together. Want to do that instead? It's great value."
- No combo: "Quick tip — [related service] goes really well with that. Want to add it on while you're here?"
- Call `accept_upsell` if yes, `decline_upsell` if no. Don't push if they say no.

**UPSELL #2** — After booking confirmed:
- The [INTERNAL] note from `create_booking` will tell you exactly what to suggest. Follow it precisely.
- Sound like an afterthought, not a pitch: "Oh and next time — [service from INTERNAL note] is something you might really enjoy too. Just a suggestion!"
- NEVER suggest beard services to female customers.
- If the INTERNAL note says skip, skip. Silence beats a weird suggestion.

Stop suggesting the moment user sounds even slightly disinterested.

## TOOL ETIQUETTE — ALWAYS SAY SOMETHING NATURAL BEFORE CALLING ANY TOOL
- `get_availability` → "Let me peek at the calendar..." / "One sec, checking that..."
- `check_available_days` → "Let me see what days are looking good..."  
- `create_booking` → "Perfect, locking that in now!" / "On it!"
- `verify_otp` → "Let me check that code real quick..."
- `list_bookings` → "Give me a second, pulling up your bookings..."
- `cancel_booking` → "Okay, taking care of that..."
- `reschedule_booking` → "Sure, let me move that for you..."

## PHONE NUMBER COLLECTION
- Mobile numbers are always 10 digits.
- User may give number in ANY format — grouped, hyphenated, word by word, or all at once:
  - "123-456-7890" → pass as "123-456-7890"
  - "123, 456, 7890" → pass as "123-456-7890"
  - "one two three four five six seven eight nine zero" → convert to "1234567890"
  - "nine eight seven... six five four... three two one zero" → wait for all digits, then pass "9876543210"
- YOUR JOB: mentally assemble ALL spoken digit groups into ONE complete string BEFORE calling `input_phone`.
- Count digits. Only call `input_phone` when you have exactly 10 digits assembled.
- NEVER call `input_phone` mid-number. NEVER call it with fewer than 10 digits.
- The tool handles all cleaning internally — just pass whatever you assembled.

## EMOTIONS & EDGE CASES
- User sounds excited? Match their energy! 
- User sounds tired or rushed? Be quick and efficient, skip the small talk.
- User is confused? Be patient and gently guide them: "No worries at all — let me walk you through it!"
- User asks something off-topic: "Ha, I wish I could help with that! I'm just here for bookings — but what can I set up for you today?"
- User is rude or impatient: Stay warm and calm. "Of course, let's get this sorted quickly for you."

## OTHER RULES
- Do NOT ask for the user's name.
- Do NOT ask for email — system maps it from phone automatically.
- If multiple bookings match a phone, ask a casual identifying question: "I see a couple bookings on that number — was yours the haircut on Tuesday?"
- Year assumption: any relative date ("tomorrow", "25th") is {now.year} unless context says otherwise.
"""
        super().__init__(instructions=instructions)

    @function_tool
    async def resend_otp(
        self,
        context: RunContext,
    ):
        """
        Re-sends the verification email (OTP) to the user's previously provided email.
        Use this if the user says they didn't get the mail, asks to send it again, or code expired.
        """
        from otp_service import generate_otp, hash_otp, send_otp_email, OTP_EXPIRY_MINUTES, OTP_RESEND_COOLDOWN_SECONDS, OTP_MAX_RESENDS
    
        fsm_ctx = context.session.fsm.ctx
        now = datetime.now(ZoneInfo("UTC"))

        # ✅ Guard: OTP was never initialized (phone not yet provided)
        email = getattr(fsm_ctx, 'email', None)
        if not email or email == "None":
            return "I don't have your email on record yet. Could you share your phone number first?"

        # ✅ Guard: use getattr with defaults to avoid AttributeError
        otp_resend_count = getattr(fsm_ctx, 'otp_resend_count', 0)
        otp_last_sent_at = getattr(fsm_ctx, 'otp_last_sent_at', None)

        # ❌ Too many resends
        if otp_resend_count >= OTP_MAX_RESENDS:
            return (
                "I've sent the code a few times already. "
                "maybe give it a few minutes before trying again?"
            )

        # ⏳ Cooldown check
        if otp_last_sent_at:
            elapsed = (now - otp_last_sent_at).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                return f"[INTERNAL] OTP resend on cooldown. Tell user warmly to wait about {wait} more seconds before trying again."

        # ✅ Resend allowed
        otp = generate_otp()
        fsm_ctx.otp_hash = hash_otp(otp)
        fsm_ctx.otp_expiry = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
        fsm_ctx.otp_last_sent_at = now
        fsm_ctx.otp_resend_count = otp_resend_count + 1

        send_otp_email(email, otp)

        return (
            "Okay… I've sent a new verification code to your email. "
            "Please check and say the six digits slowly."
        )
    
    @function_tool
    async def verify_otp(
        self,
        context: RunContext,
        otp: Annotated[str, "6 digit code spoken by user"],
    ):
        """
        Verifies the OTP code provided by the user against the one sent to their email.
        """
        from otp_service import hash_otp
        # Access FSM context attached to session
        fsm_ctx = context.session.fsm.ctx

        if datetime.now(ZoneInfo("UTC")) > fsm_ctx.otp_expiry:
            return (
                "That code has expired. "
                "Would you like me to send a new one?"
            )

        if hash_otp(otp) == fsm_ctx.otp_hash:
            fsm_ctx.otp_verified = True
            # Update FSM state to move to booking confirmation
            context.session.fsm.update_state(intent="otp_success")
            return "[INTERNAL] OTP verified successfully. Move to booking confirmation."

        return (
            "Hmm… that doesn’t seem right. "
            "Please say the six-digit code again, slowly."
        )


    @function_tool
    async def intent_book(
        self,
        context: RunContext,
    ):
        """User wants to book a new appointment. Call this when user expresses booking intent."""
        context.session.fsm.update_state(intent="book")
        return "Great! Let's get you booked."

    @function_tool
    async def intent_manage(
        self,
        context: RunContext,
    ):
        """User wants to cancel, update, or reschedule an existing appointment."""
        context.session.fsm.update_state(intent="cancel")  # Will be refined by user
        return "[INTERNAL] User wants to manage a booking. Ask for their phone number warmly."
    @function_tool
    async def input_service(
    self,
    context: RunContext,
    service: Annotated[str, "Service name or category provided by user (e.g. 'haircut', 'beard', 'Hair - Fade')"],
    ):
        """
        Capture the service or category the user wants to book.
        If user gives a broad category (e.g. 'haircut', 'beard') and multiple styles exist,
        returns the list of options so the agent asks the user to pick one.
        If user gives a specific style, confirms and stores it.
        """
    # STEP A: Try to find an exact/specific service match first
        _svc_list = context.session.active_services
        service_info = find_service_by_name(service, _svc_list)

        if service_info:
            # Exact match found — store it and proceed
            upsell_target = find_upsell_target(service_info["title"], active_services=_svc_list)
            if upsell_target:
                context.session.fsm.ctx.upsell1_suggestion = upsell_target
            context.session.fsm.update_state(data={
                "service": service_info["title"],
                "has_upsell_pending": bool(upsell_target),
            })
            upsell_hint = (
                f"Suggest upgrading to '{upsell_target}' — it complements what they chose. "
                f"Call accept_upsell if yes, decline_upsell if no."
            ) if upsell_target else "No strong upsell match. Skip upsell and ask for date/time."
            return (
                f"[INTERNAL] Service confirmed: {service_info['title']} ({service_info['duration']} min). "
                f"{upsell_hint}"
            )

    # STEP B: No exact match — try category-level match
        category_services = find_category_by_name(service, _svc_list)

        if category_services and len(category_services) > 1:
            # Multiple styles exist — ask the user to pick
            style_options = [
                f"{svc.get('style', svc['title'])} (₹{svc.get('price', '?')}, {svc['duration']} min)"
                for svc in category_services
            ]
            options_str = ", ".join([svc.get('style', svc['title']) for svc in category_services])
            return (
                f"[INTERNAL] Category '{service}' has multiple styles. "
                f"Ask user to choose one: {options_str}. "
                f"Do NOT proceed to date/time yet. Wait for their style choice."
            )

        elif category_services and len(category_services) == 1:
            # Only one service in this category — auto-select it
            svc = category_services[0]
            upsell_target = find_upsell_target(svc["title"], active_services=_svc_list)
            if upsell_target:
                context.session.fsm.ctx.upsell1_suggestion = upsell_target
            context.session.fsm.update_state(data={
                "service": svc["title"],
                "has_upsell_pending": bool(upsell_target),
            })
            upsell_hint = (
                f"Suggest upgrading to '{upsell_target}' — it complements what they chose. "
                f"Call accept_upsell if yes, decline_upsell if no."
            ) if upsell_target else "No strong upsell match. Skip upsell and ask for date/time."
            return (
                f"[INTERNAL] Only one option in '{service}' category: {svc['title']} ({svc['duration']} min). "
                f"Auto-selected. {upsell_hint}"
            )

        # STEP C: Nothing matched at all
        services = get_all_services(_svc_list)
        categories = group_services_by_category(_svc_list)
        available_categories = list(categories.keys())
        return (
            f"I couldn't find '{service}'. "
            f"Available categories: {', '.join(available_categories)}. "
            f"Ask user which category they want."
        )

    @function_tool
    async def accept_upsell(
        self,
        context: RunContext,
        primary_service: Annotated[str, "The original service already chosen (e.g. 'Haircut')"],
        addon_service: Annotated[str, "The addon service user just agreed to (e.g. 'Beard Trim')"],
    ):
        """Call this when user AGREES to an upsell suggestion."""
        fsm_ctx = context.session.fsm.ctx
        _svc_list = context.session.active_services
        combo = find_combo_service(primary_service, addon_service, _svc_list)

        if combo:
            context.session.fsm.update_state(intent="upsell_accepted", data={"service": combo["title"]})
            return (
                f"SYSTEM: Upsell accepted. Service updated to combo: '{combo['title']}' "
                f"({combo['duration']} min). Tell user you've added {addon_service} and continue."
            )

        primary_info = find_service_by_name(primary_service, _svc_list)
        addon_info = find_service_by_name(addon_service, _svc_list)

        if primary_info and addon_info:
            current_addons = getattr(fsm_ctx, "pending_addons", [])
            current_addons.append(addon_info["title"])
            fsm_ctx.pending_addons = current_addons
            context.session.fsm.update_state(intent="upsell_accepted")
            return (
                f"SYSTEM: No combo found. Book separately: '{primary_info['title']}' "
                f"({primary_info['duration']} min) then '{addon_info['title']}' ({addon_info['duration']} min)."
            )

        return f"SYSTEM: Could not find '{addon_service}'. Continue with original '{primary_service}' booking."

    @function_tool
    async def decline_upsell(
        self,
        context: RunContext,
    ):
        """Call this when user says NO to an upsell. e.g. 'no thanks', 'just the haircut', 'skip'"""
        context.session.fsm.update_state(intent="upsell_declined")
        return "No problem, let's continue with your original booking."

    @function_tool
    async def input_date(
        self,
        context: RunContext,
        date: Annotated[str, "Date provided by user (e.g., 'tomorrow', '25th', 'Dec 25')"],
    ):
        """Capture the date the user wants to book."""
        # Store the date in FSM
        context.session.fsm.update_state(data={"date": date})
        
        # Try to format for natural speech response
        try:
            # Parse with dummy time to get date object
            iso = parse_datetime(date, "12:00 PM")
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            dt_local = dt.astimezone(ZoneInfo("Asia/Kolkata"))
            spoken_date = format_spoken_date(dt_local)
            return f"Got it, {spoken_date}."
        except:
            return f"Got it, {date}."

    @function_tool
    async def input_time(
        self,
        context: RunContext,
        time: Annotated[str, "Time provided by user (e.g., '4:30 PM', 'morning', 'afternoon')"],
    ):
        """Capture the time the user wants to book."""
        # Store the time in FSM
        context.session.fsm.update_state(data={"time": time})
        
        # Clean up response to be natural (remove "evening 5pm" -> "5pm")
        response_time = time
        if any(c.isdigit() for c in time):
            import re
            # Remove period words to avoid "evening 5 pm"
            clean = time.lower()
            for word in ["morning", "afternoon", "evening", "night", "in the", "at"]:
                clean = clean.replace(word, "")
            
            clean = " ".join(clean.split())
            if clean:
                response_time = clean.upper()
                
        return f"Okay, {response_time}."

    @function_tool
    async def input_phone(
        self,
        context: RunContext,
        phone: Annotated[str, "Complete phone number — join ALL digit groups the user spoke into ONE string before passing. If user said '123, 456, 7890' pass it as '123-456-7890'. If user said 'one two three four five six seven eight nine zero' convert to '1234567890'. Include hyphens or spaces between groups if present. NEVER pass partial digits."],

    ):
        """
        Capture the user's phone number.
        CRITICAL: If user said '123-456-7890', pass the ENTIRE string '123-456-7890' as one argument.
        NEVER split it. NEVER call this tool 3 times for a hyphenated number.
        One number = one tool call, always.
        """

    # Strip everything non-digit to count actual digits received
        logger.info(f"📞 input_phone received raw: {phone!r}")
        digits_only = "".join(filter(str.isdigit, phone))
        logger.info(f"📞 input_phone digits extracted: {digits_only!r} (count={len(digits_only)})")

    # Guard: reject if we don't have enough digits for a valid Indian mobile number
        if len(digits_only) < 10:
            logger.warning(f"input_phone called with partial number: {phone!r} ({len(digits_only)} digits)")
            return (
                f"[INTERNAL] Only got {len(digits_only)} digits so far ({phone}). "
                f"The user is still giving their number. Do NOT call this tool again until you have all 10 digits. "
                f"Wait for them to finish speaking."
            )

        normalized = normalize_phone(phone)

        # Capture state BEFORE update_state changes it
        current_state = context.session.fsm.state

        context.session.fsm.update_state(data={"phone": normalized})

        # ── MANAGE FLOW ──────────────────────────────────────────────
        if current_state == State.MANAGE_ASK_PHONE:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{CAL_COM_API_URL}/bookings",
                        headers={
                            "Authorization": f"Bearer {CAL_COM_API_KEY}",
                            "cal-api-version": "2024-08-13",
                        },
                        params={"status": "upcoming"},
                        timeout=10.0,
                    )

                if response.status_code == 200:
                    bookings = response.json().get("data", [])
                    matched = []
                    for booking in bookings:
                        booking_phone = extract_booking_phone(booking)
                        if booking_phone and normalize_phone(booking_phone) == normalized:
                            matched.append(booking)

                    context.session.fsm.update_state(data={"phone": normalized, "bookings": matched})

                    if not matched:
                        return "I couldn't find any bookings with this number."
                    elif len(matched) == 1:
                        b = matched[0]
                        dt = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
                        dt_local = dt.astimezone(ZoneInfo("Asia/Kolkata"))
                        return f"Found your {b.get('title', 'appointment')} on {dt_local.strftime('%B %d at %I:%M %p')}."
                    else:
                        return f"I found {len(matched)} bookings for this number."
            except Exception as e:
                logger.error(f"Error fetching bookings: {e}")
                return "Got your phone number."

        # ── BOOKING FLOW: Auto-send OTP ──────────────────────────────
        fsm_ctx = context.session.fsm.ctx
        if not getattr(fsm_ctx, 'otp_hash', None):
            from otp_service import generate_otp, hash_otp, send_otp_email, OTP_EXPIRY_MINUTES

            email = lookup_email_by_phone(normalized)
            if not email or email == "None":
                email = DEFAULT_EMAIL

            logger.info(f"Sending OTP to email={email} for phone={normalized}")

            otp = generate_otp()
            fsm_ctx.email = email
            fsm_ctx.otp_hash = hash_otp(otp)
            fsm_ctx.otp_expiry = datetime.now(ZoneInfo("UTC")) + timedelta(minutes=OTP_EXPIRY_MINUTES)
            fsm_ctx.otp_last_sent_at = datetime.now(ZoneInfo("UTC"))
            fsm_ctx.otp_resend_count = 0

            send_otp_email(email, otp)
            logger.info(f"Auto-sent OTP to {email} (from phone {normalized})")


            return "[INTERNAL] Phone captured. OTP sent to user's email. Ask user for the verification code."

        return "Got your phone number."

    @function_tool
    async def select_booking(
        self,
        context: RunContext,
        booking_uid: Annotated[str, "UID of the booking selected by user"],
    ):
        """User has selected a specific booking from multiple options."""
        context.session.fsm.update_state(data={"booking_uid": booking_uid})
        return "Got it, I've selected that booking."

    @function_tool
    async def confirm_action(
        self,
        context: RunContext,
    ):
        """User has confirmed they want to proceed with the action (booking, cancellation, or reschedule)."""
        context.session.fsm.update_state(intent="confirm")
        return "Confirmed!"

    @function_tool
    async def list_available_services(
        self,
        context: RunContext,
    ):
        """List all available services from Cal.com, grouped by category."""
        await fetch_event_types(force_refresh=True)
        services = get_all_services(context.session.active_services)

        if not services:
            return "I couldn't fetch the available services right now."

        # ── Build categories dynamically from Cal.com titles ──────────
        # Cal.com event titles often look like "Hair - Haircut 30min"
        # or just "Facial" or "Beard Trim". We extract the part before
        # the first " - " as the category; if no dash, use the full title.
        categories: dict[str, list[str]] = {}
        for svc in services:
            title = svc["title"]
            if " - " in title:
                category, name = title.split(" - ", 1)
            else:
                category = title        # treat the whole title as its own category
                name = title
            category = category.strip()
            name = name.strip()
            categories.setdefault(category, []).append(name)

        # Build a natural spoken summary e.g. "Hair (Haircut, Colour), Facial, Spa"
        category_summary = ", ".join(
            f"{cat} ({', '.join(names)})" if len(names) > 1 else cat
            for cat, names in categories.items()
        )

        # All raw titles for the agent's internal reference (for matching)
        all_titles = ", ".join(s["title"] for s in services)

        return (
            f"[INTERNAL — do NOT read verbatim] Available service categories: {category_summary}. "
            f"Raw titles for booking lookup: {all_titles}. "
            "INSTRUCTION: When the user asks what services we offer, mention only the CATEGORY NAMES "
            "in a natural conversational way — e.g. 'We do hair treatments, facials, and spa services.' "
            "Do NOT list every individual service or duration. "
            "If the user asks for more detail about a specific category, then describe that category only."
        )
    
    @function_tool
    async def create_booking(
        self,
        context: RunContext,
        date: Annotated[str, "Date"],
        time: Annotated[str, "Time"],
        guest_phone: Annotated[str, "Phone Number"],
        service: Annotated[str, "Service title exactly as user mentioned"],
    ):
        """Create a new booking for the specified service."""
        try:
            # Find the service
            service_info = find_service_by_name(service, context.session.active_services)

            if not service_info:
                services = get_all_services(context.session.active_services)
                available = ", ".join([s['title'] for s in services])
                return f"I couldn't find a service matching '{service}'. Available services: {available}"

            # Handle vague time periods by asking for clarification
            if time.lower().strip() in ["morning", "afternoon", "evening", "evening"]:
                 return f"At what time in the {time} would you like to book?"

            current_start_str = parse_datetime(date, time)
            
            # Validate booking time
            try:
                dt_utc = datetime.fromisoformat(current_start_str.replace("Z", "+00:00"))
                dt_local = dt_utc.astimezone(ZoneInfo("Asia/Kolkata"))
                now_local = datetime.now(ZoneInfo("Asia/Kolkata"))
                if dt_local.date() < now_local.date():
                    return "I can't book in the past. Please pick a day within the next week."
                if dt_local > (now_local + timedelta(days=7)):
                    return "I can only book up to one week in advance. Please pick an earlier day."
            except Exception:
                return "I didn't catch that date. Can you say a day within the next week?"
            
            # Create the booking
            payload = {
                "start": current_start_str,
                "eventTypeSlug": service_info["slug"],
                "username": CAL_USERNAME,
                "attendee": {
                    "name": "Guest",
                    "email": context.session.fsm.ctx.email or "guest@voice.ai",
                    "phoneNumber": normalize_phone(guest_phone),
                    "timeZone": "Asia/Kolkata",
                },
                "metadata": {"title": service_info["title"]},
            }
            
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{CAL_COM_API_URL}/bookings",
                    headers={
                        "Authorization": f"Bearer {CAL_COM_API_KEY}",
                        "Content-Type": "application/json",
                        "cal-api-version": "2024-08-13",
                    },
                    json=payload,
                    timeout=15.0,
                )
                
                if res.status_code in (200, 201):
                    # Send confirmation email
                    from otp_service import send_booking_confirmation_email
                    user_email = context.session.fsm.ctx.email or "guest@voice.ai"
                    send_booking_confirmation_email(user_email, service_info['title'], date, time)
                    # ✅ Ensure FSM ctx has all booking fields before snapshot
                    fsm_ctx = context.session.fsm.ctx
                    if not getattr(fsm_ctx, "service", None):
                        fsm_ctx.service = service_info["title"]
                    if not getattr(fsm_ctx, "date", None):
                        fsm_ctx.date = date
                    if not getattr(fsm_ctx, "time", None):
                        fsm_ctx.time = time
                    if not getattr(fsm_ctx, "phone", None):
                        fsm_ctx.phone = normalize_phone(guest_phone)
                    if not getattr(fsm_ctx, "intent", None):
                        fsm_ctx.intent = "book"
                    context.session.fsm.update_state(intent="confirm")
                    
                    spoken_date = format_spoken_date(dt_local)
                    upsell1_already_suggested = getattr(context.session.fsm.ctx, "upsell1_suggestion", None)
                    upsell_target = find_upsell_target(service_info["title"], exclude=upsell1_already_suggested, active_services=context.session.active_services)
                    upsell_hint = (
                        f"Suggest '{upsell_target}' as a next-time idea — genuinely different from what they just booked."
                    ) if upsell_target else "No closing upsell needed — skip it entirely."
                    return (
                        f"[INTERNAL] Booking confirmed: {service_info['title']} on {spoken_date} at {time}. "
                        f"Email sent to user. {upsell_hint}"
                    )
                else:
                    logger.error(f"Booking failed: {res.status_code} - {res.text}")
                    return f"I couldn't book the {service_info['title']} for that time. Should we try a different slot?"

        except Exception as e:
            logger.error(f"Booking error: {e}")
            return "I had trouble booking that. Can we try again?"

    @function_tool
    async def get_availability(
        self,
        context: RunContext,
        date: Annotated[str, "Date (YYYY-MM-DD or tomorrow)"],
        service: Annotated[str, "Service title"],
        period: Annotated[str, "Optional: morning|afternoon|evening"] = "",
    ):
        """Check availability for a specific service on a given date."""
        try:
            # Find the service
            service_info = find_service_by_name(service, context.session.active_services)

            if not service_info:
                services = get_all_services(context.session.active_services)
                available = ", ".join([s['title'] for s in services])
                return f"I couldn't find '{service}'. Available services: {available}"

            iso = parse_datetime(date, "12:00 PM")
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            now_local = datetime.now(ZoneInfo("Asia/Kolkata"))
            note_prefix = ""
            
            if dt.date() < now_local.date():
                tomorrow = now_local + timedelta(days=1)
                dt = tomorrow
                note_prefix = f"(Showing availability for {format_spoken_date(dt)})\n"

            if dt > (now_local + timedelta(days=7)):
                return "I can only book up to a week in advance. Can we look at a day this week?"

            formatted_date = dt.strftime("%Y-%m-%d")

            # Get availability using V1 slots endpoint (still works with V2 auth)
            params = {
                "apiKey": CAL_COM_API_KEY,
                "eventTypeId": service_info["id"],
                "startTime": f"{formatted_date}T00:00:00.000Z",
                "endTime": f"{formatted_date}T23:59:59.999Z",
            }
            
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://api.cal.com/v1/slots",
                    params=params,
                    timeout=10.0,
                )

            if res.status_code != 200:
                logger.error(f"Availability check failed: {res.status_code} {res.text}")
                return "What time would you like to schedule?"

            json_data = res.json()
            slots_data = json_data.get("slots", json_data)
            
            day_slots = []
            if isinstance(slots_data, dict):
                day_slots = slots_data.get(formatted_date, [])
            elif isinstance(slots_data, list):
                day_slots = slots_data

            if not day_slots:
                return note_prefix + f"No slots available on {formatted_date}. Try another day."

            slots_local = []
            for s in day_slots:
                ts_str = s.get("time")
                if not ts_str:
                    continue
                dt_slot = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                slots_local.append(dt_slot.astimezone(ZoneInfo("Asia/Kolkata")))

            if not slots_local:
                return note_prefix + f"No slots available on {formatted_date}. Try another day."

            def in_period(d: datetime, p: str) -> bool:
                h = d.hour
                if p == "morning":
                    return 6 <= h < 12
                if p == "afternoon":
                    return 12 <= h < 17
                if p == "evening":
                    return 17 <= h < 22
                return False

            period_clean = (period or "").strip().lower()
            
            matched = []
            if not period_clean:
                 # IF NO PERIOD IS SPECIFIED, RETURN ALL SLOTS
                 matched = slots_local
            else:
                if period_clean not in ("morning", "afternoon", "evening"):
                    return "Please choose one of: morning, afternoon, or evening."
                matched = [s for s in slots_local if in_period(s, period_clean)]
            
            if not matched:
                 return note_prefix + f"No slots available on {formatted_date}."
            duration_mins = service_info.get("lengthInMinutes", 30)
            matched.sort()

            def fmt(d):
                return d.strftime("%I:%M %p").lstrip("0")

            # Build open windows (ranges of consecutive slots)
            ranges = []
            if matched:
                range_start = matched[0]
            range_end   = matched[0] + timedelta(minutes=duration_mins)
            for prev, curr in zip(matched, matched[1:]):
                gap = (curr - (prev + timedelta(minutes=duration_mins))).total_seconds() / 60
                if gap <= 5:
                    range_end = curr + timedelta(minutes=duration_mins)
                else:
                    ranges.append((range_start, range_end))
                    range_start = curr
                    range_end   = curr + timedelta(minutes=duration_mins)
            ranges.append((range_start, range_end))

            # Build all_slots string for internal validation only (never spoken)
            all_slots_str = ", ".join(s.strftime("%I:%M %p") for s in matched)

            # Build a human-friendly window description — NO individual slot times
            if len(ranges) == 1:
                open_window = f"from {fmt(ranges[0][0])} to {fmt(ranges[0][1])}"
            else:
                window_strs = [f"{fmt(rs)} to {fmt(re)}" for rs, re in ranges]
                open_window = " and ".join(window_strs)

            return (
                f"[INTERNAL] "
                f"Available window: {open_window}. "
                f"Full slot list (for validation ONLY — NEVER read aloud): {all_slots_str}. "
                "INSTRUCTIONS: Tell the user the open window naturally, like 'We're pretty open from 10 AM to 6 PM — what time works for you?' "
                "NEVER list individual slot times. NEVER say specific times unless the user asks. "
                "Just describe the open window and let the user pick any time within it. "
                "When user gives a time, check it against the full slot list silently and confirm if it's available. "
                "If their time is not in the list, say the window is open but that exact minute isn't free, and ask them to pick another time within the window."
            )

        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return "What time would you like to schedule?"

    @function_tool
    async def check_available_days(
        self,
        context: RunContext,
        service: Annotated[str, "Service title"],
    ):
        """
        Finds the nearest upcoming days that have availability. 
        Use this when the user asks "When are you available?" or "Which days do you have connected?" without specifying a date.
        """
        try:      
            # Find the service
            service_info = find_service_by_name(service, context.session.active_services)
            if not service_info:
                services = get_all_services(context.session.active_services)
                available = ", ".join([s['title'] for s in services])
                return f"I couldn't find '{service}'. Available services: {available}"

            now_local = datetime.now(ZoneInfo("Asia/Kolkata"))
            start_date_utc = now_local.astimezone(ZoneInfo("UTC"))
            end_date_utc = start_date_utc + timedelta(days=7) # Look ahead 7 days (limit)

            params = {
                "apiKey": CAL_COM_API_KEY,
                "eventTypeId": service_info["id"],
                "startTime": start_date_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "endTime": end_date_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            }
            
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://api.cal.com/v1/slots",
                    params=params,
                    timeout=10.0,
                )

            if res.status_code != 200:
                logger.error(f"Days check failed: {res.status_code} {res.text}")
                return "I couldn't check my calendar right now. Please try proposing a specific date."

            json_data = res.json()
            slots_data = json_data.get("slots", json_data)
            available_days = []
            
            # slots_data is typically { "2023-12-22": [...], "2023-12-23": [...] }
            if isinstance(slots_data, dict):
                sorted_dates = sorted(slots_data.keys())
                for date_str in sorted_dates:
                    day_slots = slots_data[date_str]
                    if day_slots and len(day_slots) > 0:
                        # Check if at least one slot is in the future (if today)
                        # Simplified: just assume if API returns it, it's valid, 
                        # but we should filter past slots if it's strictly today.
                        # For day-level availability, presence of slots is usually enough.
                        try:
                             d = datetime.strptime(date_str, "%Y-%m-%d").date()
                             if d >= now_local.date():
                                 available_days.append(d)
                        except ValueError:
                             continue
                             
            elif isinstance(slots_data, list):
                # Rare case where V1 returns list for single day, unlikely for range query
                pass

            if not available_days:
                return "I don't have any openings in the next 7 days."

            if not available_days:
                return "I don't have any openings in the next 7 days."

            # Check availability status for response phrasing
            is_today_available = any(d == now_local.date() for d in available_days)
            
            if is_today_available:
                return "We are available today and any time for the rest of the week. What day and time works best for you?"
            
            # If not available today, find next available
            next_available = next((d for d in available_days if d > now_local.date()), None)
            
            if next_available:
                next_day_str = next_available.strftime("%A") # e.g. "Monday"
                return f"We are full for today, but we are available from {next_day_str} onwards. What time would you like to book?"
            
            return "I don't have any openings in the next 7 days."

        except Exception as e:
            logger.error(f"Error checking available days: {e}")
            return "I couldn't check availability exactly. Please tell me a specific date you'd like."
        
    @function_tool
    async def reschedule_booking(
        self,
        context: RunContext,
        booking_uid: Annotated[str, "Existing booking UID"],
        new_date: Annotated[str, "New date"],
        new_time: Annotated[str, "New time (must be from availability)"],
        guest_phone: Annotated[str, "Phone number"],
        service: Annotated[str, "Service title for the rescheduled booking"],
    ):
        """Reschedule an existing booking to a new date and time."""
        try:
            # Cancel existing booking
            async with httpx.AsyncClient() as client:
                cancel_res = await client.post(
                    f"{CAL_COM_API_URL}/bookings/{booking_uid}/cancel",
                    headers={
                        "Authorization": f"Bearer {CAL_COM_API_KEY}",
                        "cal-api-version": "2024-08-13",
                    },
                    json={"cancellationReason": "User requested reschedule"},
                    timeout=10.0,
                )

            if cancel_res.status_code not in (200, 201):
                return "I couldn't cancel your existing booking."

            # Find the service
            service_info = find_service_by_name(service, context.session.active_services)
            if not service_info:
                services = get_all_services(context.session.active_services)
                available = ", ".join([s['title'] for s in services])
                return f"I couldn't find '{service}'. Available services: {available}"

            # Create new booking
            start_time = parse_datetime(new_date, new_time)

            payload = {
                "start": start_time,
                "eventTypeSlug": service_info["slug"],
                "username": CAL_USERNAME,
                "attendee": {
                    "name": "Guest",
                    "email": "guest@voice.ai",
                    "phoneNumber": normalize_phone(guest_phone),
                    "timeZone": "Asia/Kolkata",
                },
                "metadata": {
                    "title": service_info["title"],
                    "source": "rescheduled-via-voice-agent",
                },
            }

            async with httpx.AsyncClient() as client:
                book_res = await client.post(
                    f"{CAL_COM_API_URL}/bookings",
                    headers={
                        "Authorization": f"Bearer {CAL_COM_API_KEY}",
                        "Content-Type": "application/json",
                        "cal-api-version": "2024-08-13",
                    },
                    json=payload,
                    timeout=15.0,
                )

            if book_res.status_code in (200, 201):
                return f"Your {service_info['title']} appointment has been successfully rescheduled to {new_date} at {new_time}."

            return "I cancelled your old booking, but couldn't create the new one. Please book again."

        except Exception as e:
            logger.error(f"Reschedule error: {e}")
            return "Something went wrong while rescheduling."

    @function_tool
    async def list_bookings(
        self,
        context: RunContext,
        phone_number: Annotated[str, "Phone number used for booking"],
    ):
        """List all upcoming bookings for a phone number."""
        try:
            target_phone = normalize_phone(phone_number)

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{CAL_COM_API_URL}/bookings",
                    headers={
                        "Authorization": f"Bearer {CAL_COM_API_KEY}",
                        "cal-api-version": "2024-08-13",
                    },
                    params={"status": "upcoming"},
                    timeout=10.0,
                )

            if response.status_code != 200:
                return "I couldn't access your bookings."

            bookings = response.json().get("data", [])

            # Filter by phone
            matched = []
            for booking in bookings:
                booking_phone = extract_booking_phone(booking)
                if booking_phone and normalize_phone(booking_phone) == target_phone:
                    matched.append(booking)

            if not matched:
                return "I couldn't find any bookings with this phone number."

            # Format results
            results = []
            for b in matched:
                uid = b["uid"]
                start = b["start"]
                title = b.get("title", "Appointment")
                dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
                dt_local = dt.astimezone(ZoneInfo("Asia/Kolkata"))
                spoken_date = format_spoken_date(dt_local)
                results.append(
                    f"{title} on {spoken_date} at {dt_local.strftime('%I:%M %p')} (ID: {uid})"
                )

            return f"I found {len(results)} booking(s): " + "; ".join(results)

        except Exception as e:
            logger.error(f"List bookings error: {e}")
            return "Something went wrong while checking your bookings."

    @function_tool
    async def cancel_booking(
        self,
        context: RunContext,
        booking_uid: Annotated[str, "The UID of the booking to cancel"],
        cancellation_reason: Annotated[str, "Reason for cancellation as spoken by the user. NEVER use a default. ALWAYS ask the user 'May I ask why you'd like to cancel?' and wait for their answer before calling this tool."],  # ✅ Remove default
    ):
        """Cancel an existing booking. CRITICAL: You MUST ask the user for their cancellation reason before calling this tool. Never call this tool without a real reason from the user."""
        try:
            logger.info(f"Canceling booking: {booking_uid}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{CAL_COM_API_URL}/bookings/{booking_uid}/cancel",
                    headers={
                        "Authorization": f"Bearer {CAL_COM_API_KEY}",
                        "cal-api-version": "2024-08-13",
                    },
                    json={
                        "cancellationReason": cancellation_reason,
                    },
                    timeout=10.0,
                )
                
                if response.status_code in [200, 201]:
                    return "[INTERNAL] Cancellation done."
                else:
                    logger.error(f"Cancel booking failed: {response.text}")
                    return "I couldn't cancel it. It might be already cancelled."
                    
        except Exception as e:
            logger.error(f"Error canceling booking: {str(e)}")
            return "I had trouble canceling that. Please try again."


server = AgentServer()


async def log_conversation(
    session,
    project_id: str | None,
    agent_config: dict | None,
    call_start: float,
    call_start_dt: str = "",
) -> None:
    """
    Phase 5: Extract all structured call data from FSM + session,
    then POST to Next.js backend for storage.
    """
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000").rstrip("/")
    secret = os.getenv("VOICE_AGENT_SECRET", "")

    duration_seconds = int(time.monotonic() - call_start)

    await asyncio.sleep(2.5)  # ✅ wait for chat_ctx to flush final messages before reading

    # ── 1. Extract transcript (user + assistant only, strip [INTERNAL]) ────
    messages = []
    try:
        raw_history = None
        for attr in ["history", "chat_ctx", "_chat_ctx", "_history"]:
            val = getattr(session, attr, None)
            if val is None:
                continue
            # Unwrap callable up to 2 levels deep (some SDK versions double-wrap)
            for _ in range(2):
                if callable(val):
                    try:
                        val = val()
                    except Exception:
                        val = None
                        break
                else:
                    break
            if val is None:
                continue
            raw_history = val
            logger.info(f"transcript: found history via '{attr}', type={type(val).__name__}, has_messages={hasattr(val, 'messages')}")
            break

        # Unwrap .messages — handle it being a method OR a property
        if raw_history is not None:
            raw_messages = getattr(raw_history, "messages", None)
            # If .messages is a method, call it
            if callable(raw_messages):
                try:
                    raw_messages = raw_messages()
                except Exception:
                    raw_messages = None
            # If still None, try iterating raw_history directly
            if raw_messages is None:
                raw_messages = list(raw_history) if hasattr(raw_history, "__iter__") else []
            else:
                raw_messages = list(raw_messages)
            logger.info(f"transcript: message count = {len(raw_messages)}")
        else:
            raw_messages = []
            logger.warning("transcript: could not find history — tried history, chat_ctx, _chat_ctx, _history")

        for msg in raw_messages:
            role = getattr(msg, "role", "unknown")
            role_str = role.value if hasattr(role, "value") else str(role)

            if role_str not in ("user", "assistant"):
                continue

            raw_content = getattr(msg, "content", "")
            if isinstance(raw_content, list):
                content_str = " ".join(
                    part if isinstance(part, str) else getattr(part, "text", str(part))
                    for part in raw_content
                )
            else:
                content_str = str(raw_content)

            content_str = content_str.strip()
            if content_str.startswith("[INTERNAL]") or content_str.startswith("[SYSTEM NOTE]"):
                continue
            if "[INTERNAL]" in content_str:
                content_str = content_str[:content_str.index("[INTERNAL]")].strip()

            if content_str:
                messages.append({"role": role_str, "content": content_str})

        logger.info(f"transcript: extracted {len(messages)} user/assistant messages")

    except Exception as e:
        logger.warning(f"log_conversation: could not extract chat messages — {e}")

    # ── 2. Extract all structured fields from FSM context ─────────────────
    fsm = None
    fsm_ctx = None
    try:
        fsm = getattr(session, "fsm", None)
        if fsm:
            fsm_ctx = getattr(fsm, "ctx", None)
    except Exception as e:
        logger.warning(f"log_conversation: could not read FSM — {e}")

    # Read from completed_ctx, dropped snapshot, live ctx, then _last_* fallbacks
    def fsm_get(attr, fallback_attr=None, default=None):
        # 1. completed_ctx — set after successful booking/cancel/reschedule
        completed = getattr(fsm, "completed_ctx", None) if fsm else None
        if completed is not None:
            val = getattr(completed, attr, None)
            if val is not None:
                return val
        # 2. _dropped_ctx_snapshot — snapshotted at moment of disconnect (dropped calls)
        dropped = getattr(fsm, "_dropped_ctx_snapshot", None) if fsm else None
        if dropped is not None:
            val = getattr(dropped, attr, None)
            if val is not None:
                return val
        # 3. live ctx
        val = getattr(fsm_ctx, attr, None) if fsm_ctx else None
        if val is not None:
            return val
        # 4. _last_* saved on fsm object before FSM reset
        if fsm and fallback_attr:
            val = getattr(fsm, fallback_attr, None)
            if val is not None:
                return val
        return default

    phone           = fsm_get("phone",           "_last_phone")
    service         = fsm_get("service",          "_last_service")
    booked_date     = fsm_get("date",             "_last_date")
    booked_time     = fsm_get("time",             "_last_time")
    intent          = fsm_get("intent",           "_last_intent")
    call_type       = intent or "unknown"
    upsell_accepted = fsm_get("upsell_accepted",  "_last_upsell_accepted", False)
    upsell_suggestion = fsm_get("upsell1_suggestion", "_last_upsell_suggestion")
    # Also check direct attribute on fsm object (set in input_service tool)
    if upsell_suggestion is None and fsm:
        upsell_suggestion = getattr(fsm, "_last_upsell_suggestion", None)
    if upsell_suggestion is None and fsm_ctx:
        upsell_suggestion = getattr(fsm_ctx, "upsell1_suggestion", None)
    upsell_combo_applied = getattr(fsm_ctx, "upsell_combo_applied", False) if fsm_ctx else False

    if upsell_suggestion is None:
        upsell_status = "not_offered"
    elif upsell_accepted:
        upsell_status = "accepted"
    else:
        upsell_status = "declined"

    # Amount — look up price from cached event types by matching service name
    amount = None
    try:
        if service:
            service_info = find_service_by_name(service)
            if service_info:
                # Price is in description field as "Price: $X" or similar
                desc = service_info.get("description", "")
                if desc:
                    price_match = re.search(r"[₹$]\s*(\d+(?:\.\d+)?)", desc, re.IGNORECASE)
                    if price_match:
                        amount = float(price_match.group(1))
    except Exception as e:
        logger.warning(f"log_conversation: could not extract amount — {e}")

    # Outcome for stats (booked / cancelled / rescheduled / dropped)
    if call_type == "book" and service and booked_date and booked_time:
        outcome = "booked"
    elif call_type == "cancel":
        outcome = "cancelled"
    elif call_type in ("reschedule", "update"):
        outcome = "rescheduled"
    elif call_type == "cancel_all":
        outcome = "cancelled"
    elif messages or (call_type and call_type != "unknown"):
        outcome = "enquiry"
    else:
        outcome = "dropped"

    # Direction is always inbound for now
    direction = "inbound"

    # ── 3. Build payload ───────────────────────────────────────────────────
    payload = {
        # Transcript
        "transcript": {"messages": messages},

        # Structured call data
        "phone": phone,
        "service": service,
        "bookedDate": booked_date,
        "bookedTime": booked_time,
        "callType": call_type,
        "upsellStatus": upsell_status,
        "upsellSuggestion": upsell_suggestion,
        "amount": amount,
        "outcome": outcome,
        "direction": direction,
        "durationSeconds": duration_seconds,
        "callStartedAt": call_start_dt,

        # Legacy summary field (keep for backward compat)
        "summary": (
            f"{call_type.upper()} call — {service or 'no service'} — "
            f"{outcome} — {duration_seconds}s"
        ),

        # Metadata
        "metadata": {
            "projectId":      project_id,
            "agentName":      (agent_config or {}).get("agentName"),
            "businessName":   (agent_config or {}).get("businessName"),
            "durationSeconds": duration_seconds,
            "outcome":        outcome,
            "callType":       call_type,
            "upsellStatus":   upsell_status,
            "phone":          phone,
            "service":        service,
            "bookedDate":     booked_date,
            "bookedTime":     booked_time,
            "amount":         amount,
            "direction":      direction,
            "callStartedAt":  call_start_dt,
        },
    }

    logger.info(
        f"📋 Call data extracted — phone={phone}, service={service!r}, "
        f"outcome={outcome}, upsell={upsell_status}, duration={duration_seconds}s"
    )

    # ── 4. POST to backend ─────────────────────────────────────────────────
    url = f"{backend_url}/api/conversations"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {secret}",
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=10.0)

        if res.status_code in (200, 201):
            logger.info(
                f"✅ Phase 5: Conversation logged — duration={duration_seconds}s, "
                f"outcome={outcome!r}, phone={phone!r}"
            )
        else:
            logger.warning(
                f"⚠️  Phase 5: Conversation log returned HTTP {res.status_code}: {res.text[:300]}"
            )
    except httpx.ConnectError:
        logger.error(
            f"Phase 5: Could not connect to backend at {backend_url} to log conversation."
        )
    except Exception as e:
        logger.error(f"Phase 5: Unexpected error logging conversation — {e}")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session()
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # ── Phase 1: Resolve projectId ─────────────────────────────────────────
    # The frontend names every LiveKit room "project-{projectId}", so the room
    # name is the most reliable place to extract the projectId from.
    project_id: str | None = None

    room_name = ctx.room.name or ""
    if room_name.startswith("project-"):
        project_id = room_name[len("project-"):]
        logger.info(f"📦 projectId extracted from room name: {project_id!r}")
    else:
        # Fallback: scan remote participants for token metadata
        # (participant metadata is set by the frontend when generating the
        # LiveKit token and embedded as JSON: {projectId, agentName, ...})
        try:
            for participant in ctx.room.remote_participants.values():
                raw_meta = participant.metadata
                if raw_meta:
                    meta = json.loads(raw_meta)
                    pid = meta.get("projectId")
                    if pid:
                        project_id = pid
                        logger.info(
                            f"📦 projectId extracted from participant metadata: {project_id!r}"
                        )
                        break
        except Exception as meta_err:
            logger.warning(f"Could not read participant metadata: {meta_err}")
 
    if not project_id:
        logger.warning(
            "⚠️  No projectId could be determined. "
            "Room name does not match 'project-<id>' pattern and no participant "
            "metadata was found. Agent will start with default configuration."
        )
    
    # ── Phase 1: Fetch project config from frontend ────────────────────────
    agent_config: dict | None = None
    if project_id:
        agent_config = await fetch_project_config(project_id)
        if agent_config:
            logger.info(
                f"✅ Project config ready for session "
                f"(project={project_id!r}, "
                f"agent={agent_config.get('agentName')!r})"
            )
        else:
            logger.warning(
                f"⚠️  fetch_project_config returned None for project {project_id!r}. "
                "Falling back to default agent configuration."
            )

    # ── Fetch Cal.com event types, then filter to project-configured services ─
    await fetch_event_types()
    active_services = filter_services_by_project(agent_config)  # ✅ per-session list, never mutates global
    logger.info(f"Active services for this session: {[s['title'] for s in active_services]}")

    # ── Initialize FSM ─────────────────────────────────────────────────────
    fsm_instance = FSM()

    # ── Phase 4: Resolve voice ID from project config ──────────────────────
    # Default voice: Ishan (warm Indian English male, Cartesia sonic-3)
    DEFAULT_VOICE_ID = "2b035a4d-c001-49a7-8505-f050c4250d97"
    voice_id = (
        (agent_config or {}).get("voiceId") or DEFAULT_VOICE_ID
    )
    logger.info(
        f"🎙️  Voice ID for this session: {voice_id!r} "
        f"({'from project config' if agent_config and agent_config.get('voiceId') else 'default fallback'})"
    )

    # ── Build AgentSession ─────────────────────────────────────────────────
    session = AgentSession(
        # stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        # stt=inference.STT(model="cartesia/ink-whisper",
        #  language="en"
        # ),
        stt=groq.STT(
            model="whisper-large-v3",
            detect_language=True,
        ),
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        # llm=groq.LLM(model="openai/gpt-oss-20b"),
        # tts=inference.TTS(
        #     model="cartesia/sonic-3",
        #     voice=voice_id,  # Phase 4: dynamic per project
        # ),

        tts=sarvam.TTS(
            target_language_code="hi-IN",
            model="bulbul:v3-beta",
            speaker="shubh",
            pace=1.1,
        ),
        # tts=resemble.TTS(
        #     voice_uuid="c99f388c",
        # ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    # Attach FSM to session for access in tools
    session.fsm = fsm_instance
    session.active_services = active_services  # ✅ per-session service list

    # Attach project config to session so tools/handlers can access it if needed
    session.agent_config = agent_config

    # sneeze_manager = SneezeManager(session)
    # session.sneeze_manager = sneeze_manager

    silence_monitor = SilenceMonitor(session, timeout_seconds=10.0)
    session.silence_monitor = silence_monitor
    setup_silence_detection(session, silence_monitor)

    await ctx.connect()

    _assistant=Assistant(agent_config=agent_config)

    call_start = time.monotonic()
    call_start_dt = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()

    # Agent config flows: my_agent → Assistant.__init__ → dynamic identity + greeting
    await session.start(
        agent=_assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )


    # ── Phase 5: Register disconnect handler to log the conversation ───────
    # We capture the variables we need via closure.
    # FIXED:
    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant):
        if getattr(participant, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
            return  # ignore agent self-disconnect

        logger.info(f"📴 Participant disconnected: {participant.identity!r} — scheduling conversation log.")

        # ✅ Cancel silence monitor immediately so it doesn't fire after disconnect
        sm = getattr(session, "silence_monitor", None)
        if sm:
            sm.cancel()

        # ✅ Snapshot FSM context RIGHT NOW before session teardown
        fsm = getattr(session, "fsm", None)
        if fsm and fsm.ctx:
            import copy
            fsm._dropped_ctx_snapshot = copy.copy(fsm.ctx)

        asyncio.ensure_future(
            asyncio.shield(
                log_conversation(session, project_id, agent_config, call_start, call_start_dt)
            )
        )

    # ── Phase 2: Dynamic greeting from project config ─────────────────────
    # The Assistant stores the greeting it computed from agent_config.
    # Fall back to a constructed greeting if something unexpected occurred.
    if hasattr(_assistant, "_greeting") and _assistant._greeting:
        opening_line = _assistant._greeting
    elif agent_config:
        _n = agent_config.get("agentName", "Shubh Patel")
        _b = agent_config.get("businessName", "Luminox Salons")
        opening_line = f"Hello! I'm {_n} from {_b}. How can I help you today?"
    else:
        opening_line = "Hello! I'm Shubh Patel from Luminox Salons. How can I help you today?"

    logger.info(f"🗣️  Opening greeting: {opening_line!r}")
    await session.say(opening_line, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(server)