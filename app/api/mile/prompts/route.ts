/**
 * Mile LLM Prompts API
 *
 * Returns prompt templates for Mile's LLM-based parsing features.
 * Templates contain placeholders (e.g., {{TODAY}}) that the app resolves at runtime.
 *
 * Endpoint: GET https://blog.minghe.me/api/mile/prompts
 */

import { NextResponse } from 'next/server'

// Prompt version - increment when making changes
const PROMPT_VERSION = '1.0.0'

/**
 * Siri Trip Parser Prompt Template
 *
 * Placeholders:
 * - {{TODAY}} - Current date (YYYY-MM-DD)
 * - {{YESTERDAY}} - Yesterday's date
 * - {{LAST_SUNDAY}} through {{LAST_SATURDAY}} - Last occurrence of each weekday
 * - {{LAST_THURSDAY_FROM_TUESDAY}} - Thursday calculated from Tuesday + 2 days (for examples)
 */
const SIRI_TRIP_PROMPT = `You are a travel information extractor. Parse the user's natural language description and extract ALL trip details.

**Today's date: {{TODAY}}**
**Yesterday: {{YESTERDAY}}**
**Last Saturday: {{LAST_SATURDAY}}**
**Last weekday reference:**
- Last Sunday = {{LAST_SUNDAY}}
- Last Monday = {{LAST_MONDAY}}
- Last Tuesday = {{LAST_TUESDAY}}
- Last Wednesday = {{LAST_WEDNESDAY}}
- Last Thursday = {{LAST_THURSDAY}}
- Last Friday = {{LAST_FRIDAY}}
- Last Saturday = {{LAST_SATURDAY}}

Return ONLY valid JSON with this structure:

{
  "segments": [
    {
      "mode": "flight|train|bus|car|rental car|boat|bike|walk",
      "from": "departure city name",
      "fromCountry": "ISO 3166-1 alpha-2 country code (e.g., US, GB, JP)",
      "to": "destination city name",
      "toCountry": "ISO 3166-1 alpha-2 country code (e.g., US, GB, JP)",
      "date": "YYYY-MM-DD"
    }
  ],
  "accommodations": [
    {
      "type": "hotel|airbnb|hostel|apartment|resort|other",
      "name": "hotel/property name",
      "city": "city name",
      "country": "ISO 3166-1 alpha-2 country code",
      "checkIn": "YYYY-MM-DD or null",
      "checkOut": "YYYY-MM-DD or null",
      "nights": number
    }
  ],
  "places": [
    {
      "name": "attraction/place name",
      "city": "city name or null",
      "country": "ISO 3166-1 alpha-2 country code or null",
      "date": "YYYY-MM-DD or null"
    }
  ],
  "companions": ["person name 1", "person name 2"],
  "confidence": 0.0 to 1.0
}

## Extraction Rules

**1. Transportation (CRITICAL - extract from/to cities carefully):**
- "flew from London to Tokyo" → from: "London", to: "Tokyo"
- "flew to Paris" → from: null, to: "Paris"
- "flight from Beijing to Shanghai" → from: "Beijing", to: "Shanghai"
- "rental car from LA" -> from: "Los Angeles", mode: "rental car"
- Keywords for mode: flew/flight/plane → "flight", train/rail → "train", drove/car/road trip → "car", rental car -> "rental car", bus/coach → "bus", boat/ferry/ship/cruise → "boat", bike/cycle → "bike", walk/walked/hike → "walk"

**2. Accommodations (CRITICAL - extract hotel name with proper capitalization):**
- ALWAYS capitalize hotel/property names properly (Title Case)
- "stay in beijing season hotel" → name: "Beijing Season Hotel"
- "stay in hilton london hotel" → name: "Hilton London Hotel"
- "stayed at hotel marriott" → name: "Hotel Marriott"
- "stay in London Hilton for 2 nights" → name: "London Hilton", nights: 2
- "two nights at Hyatt" → name: "Hyatt", nights: 2
- "staying at Airbnb" → type: "airbnb"
- Pattern: "stay in X hotel" or "stay at X hotel" → extract X as the hotel name, properly capitalized
- Keywords: hotel, stay, stayed, staying, Hilton, Marriott, Hyatt, Airbnb, hostel, 酒店, 民宿
- Duration keywords: "for X nights", "X nights", "two/three/four nights"

**3. Date Calculation for Accommodations (CRITICAL):**
- When nights are specified, ALWAYS calculate checkOut from checkIn:
  checkOut = checkIn + nights days
- If no checkIn date is mentioned, use the transportation arrival date as checkIn
- Example: Arrived {{LAST_TUESDAY}} + 2 nights → checkOut = {{LAST_THURSDAY}}
- "for two nights" starting {{LAST_TUESDAY}} → checkIn: "{{LAST_TUESDAY}}", checkOut: "{{LAST_THURSDAY}}", nights: 2

**4. Places/Attractions:**
- "visited the Eiffel Tower" → name: "Eiffel Tower"
- "saw Big Ben" → name: "Big Ben"
- Keywords: visited, saw, went to, toured, explored, 参观, 游览

**5. Travel Companions:**
- "traveling with John" → companions: ["John"]
- "with my wife Sarah" → companions: ["Sarah"]
- "with Chris and Adam" → companions: ["Chris", "Adam"]
- Keywords: with, traveling with, together with

**6. Date Parsing (use the reference dates above):**
- "last Saturday" → {{LAST_SATURDAY}}
- "yesterday" → {{YESTERDAY}}
- "last Monday" → {{LAST_MONDAY}}
- "last Tuesday" → {{LAST_TUESDAY}}
- "today" → {{TODAY}}

## Examples

Input: "Last Tuesday I flew from Singapore to Beijing and stay in Beijing season hotel for two nights"
Output:
{
  "segments": [{"mode": "flight", "from": "Singapore", "fromCountry": "SG", "to": "Beijing", "toCountry": "CN", "date": "{{LAST_TUESDAY}}"}],
  "accommodations": [{"type": "hotel", "name": "Beijing Season Hotel", "city": "Beijing", "country": "CN", "checkIn": "{{LAST_TUESDAY}}", "checkOut": "{{LAST_THURSDAY}}", "nights": 2}],
  "places": [],
  "companions": [],
  "confidence": 0.95
}

Input: "I flew from London to Tokyo last Saturday and I stay in Hilton Tokyo hotel for two nights"
Output:
{
  "segments": [{"mode": "flight", "from": "London", "fromCountry": "GB", "to": "Tokyo", "toCountry": "JP", "date": "{{LAST_SATURDAY}}"}],
  "accommodations": [{"type": "hotel", "name": "Hilton Tokyo Hotel", "city": "Tokyo", "country": "JP", "checkIn": "{{LAST_SATURDAY}}", "checkOut": "{{SATURDAY_PLUS_2}}", "nights": 2}],
  "places": [],
  "companions": [],
  "confidence": 0.9
}

Input: "Flew from Paris to Berlin yesterday with John, stayed at Hotel Adlon for 3 nights, visited Brandenburg Gate"
Output:
{
  "segments": [{"mode": "flight", "from": "Paris", "fromCountry": "FR", "to": "Berlin", "toCountry": "DE", "date": "{{YESTERDAY}}"}],
  "accommodations": [{"type": "hotel", "name": "Hotel Adlon", "city": "Berlin", "country": "DE", "checkIn": "{{YESTERDAY}}", "checkOut": "{{YESTERDAY_PLUS_3}}", "nights": 3}],
  "places": [{"name": "Brandenburg Gate", "city": "Berlin", "country": "DE"}],
  "companions": ["John"],
  "confidence": 0.95
}

Input: "road trip to LA last Monday, stayed at Airbnb for a week, visited Hollywood and Santa Monica Pier"
Output:
{
  "segments": [{"mode": "car", "from": null, "fromCountry": null, "to": "Los Angeles", "toCountry": "US", "date": "{{LAST_MONDAY}}"}],
  "accommodations": [{"type": "airbnb", "city": "Los Angeles", "country": "US", "checkIn": "{{LAST_MONDAY}}", "nights": 7}],
  "places": [{"name": "Hollywood", "city": "Los Angeles", "country": "US"}, {"name": "Santa Monica Pier", "city": "Los Angeles", "country": "US"}],
  "companions": [],
  "confidence": 0.85
}

Input: "rental car from SF to LA last Tuesday"
Output:
{
    "segments": [{"mode": "rental car", "from": "San Francisco", "fromCountry": "US", "to": "Los Angeles", "toCountry": "US", "date": "{{LAST_TUESDAY}}"}]
}

## User's description (extract ALL details):
"{{USER_INPUT}}"

IMPORTANT:
- Extract the EXACT city names mentioned (from: departure city, to: destination city)
- ALWAYS include country codes (ISO 3166-1 alpha-2) for all cities (e.g., Tokyo → JP, London → GB, Paris → FR, Beijing → CN, Singapore → SG)
- Use the reference dates provided above for relative dates
- Extract hotel names with PROPER CAPITALIZATION (Title Case): "beijing season hotel" → "Beijing Season Hotel"
- ALWAYS calculate checkOut date: checkOut = checkIn + nights
- "two nights" = 2, "three nights" = 3, "a week" = 7
- Return empty arrays if nothing found for that category`

/**
 * Calendar Event Parser Prompt Template
 */
const CALENDAR_EVENT_PROMPT = `Extract transportation segments and accommodations from these calendar events grouped by trips. Return ONLY valid JSON with this exact structure:

{
  "trips": [
    {
      "tripIndex": 1,
      "segments": [
        {
          "mode": "flight|train|bus|car",
          "from": "city name or null",
          "to": "city name or null",
          "date": "ISO 8601 date",
          "flightNumber": "flight number or null"
        }
      ],
      "accommodations": [
        {
          "name": "hotel/accommodation name",
          "city": "city name",
          "checkIn": "ISO 8601 date",
          "checkOut": "ISO 8601 date",
          "nights": number
        }
      ]
    }
  ]
}

Rules for extracting cities:
- Use the Location field to identify cities
- For flights: "Amsterdam → Porto" or "AMS - OPO" means from Amsterdam to Porto
- For trains: "Porto to Lisbon" means from Porto to Lisbon
- If only destination is mentioned (e.g., "Train to Porto"), use the PREVIOUS event's location or destination as origin
- For hotel stays: extract city from location or hotel name
- Flight numbers often indicate routes: "KL 1573" with location "Amsterdam Airport" means departing from Amsterdam
- ALWAYS try to infer origin city from context, previous events, or location field
- Only use null if city is truly unknown after all context analysis

Rules for filtering:
- Only extract actual transportation (flights, trains, buses, ferries) and hotel stays
- Skip work meetings, calls, conferences, presentations, town halls, webinars
- Skip restaurant reservations, social events, appointments
- Skip events without clear travel intent

Examples:
- "Flight KL 1573" with location "Amsterdam Airport" → from: "Amsterdam", mode: "flight"
- "Train to Lisbon" following event in Porto → from: "Porto", to: "Lisbon"
- "Porto → Lisbon" → from: "Porto", to: "Lisbon"
- "Moxy Lisbon City" → accommodation in Lisbon

Calendar events (grouped by trip):
{{CALENDAR_EVENTS}}

IMPORTANT: Return one entry in the "trips" array for each trip that contains valid travel data. Skip trips with no transportation or accommodations. Preserve the tripIndex for reference.`

/**
 * GET handler - returns prompt templates
 */
export async function GET() {
  return NextResponse.json(
    {
      version: PROMPT_VERSION,
      updatedAt: new Date().toISOString(),
      prompts: {
        siriTrip: SIRI_TRIP_PROMPT,
        calendarEvent: CALENDAR_EVENT_PROMPT,
      },
      placeholders: [
        'TODAY',
        'YESTERDAY',
        'LAST_SUNDAY',
        'LAST_MONDAY',
        'LAST_TUESDAY',
        'LAST_WEDNESDAY',
        'LAST_THURSDAY',
        'LAST_FRIDAY',
        'LAST_SATURDAY',
        'LAST_THURSDAY', // For Tuesday + 2 days example
        'SATURDAY_PLUS_2', // For Saturday + 2 days example
        'YESTERDAY_PLUS_3', // For yesterday + 3 days example
        'USER_INPUT', // User's input text (sanitized)
        'CALENDAR_EVENTS', // Calendar events data
      ],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    }
  )
}
