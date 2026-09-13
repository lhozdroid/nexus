# Public Phrase And Joke API Options

This research was checked on 2026-09-13. Sources are limited to each service's own documentation, endpoint responses, or service status page. A TUI should fetch on demand, enforce a short local display limit, and cache the last successful value so an outage does not blank the sidebar.

## Recommendation At A Glance

| API | Tone fit | Auth | Main reason |
|---|---|---|---|
| **JokeAPI** | **Best default** | None | Explicit safe mode plus blacklist flags, category and single-line controls |
| **Chuck Norris API** | Good for geek/comic facts | None observed/documented | Hand-curated, category-selectable facts; no safety filter or stated rate limit |
| **icanhazdadjoke** | **Good alternative** | None | Simple dad-joke corpus and JSON response; no safety guarantee or moderation filter |
| **Evil Insult API** | **Not appropriate by default** | None documented | Generates insults with no documented safety/moderation controls; official examples include extreme abuse |

## 1. JokeAPI (Safe Mode)

**Exact HTTPS request:**

```text
GET https://v2.jokeapi.dev/joke/Misc,Programming,Pun?safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single&lang=en
```

The official documentation says JokeAPI requires no token, membership, registration, or payment. It documents `safe-mode` as a valueless parameter that tries to serve only jokes considered safe for everyone. It also documents blacklist flags for `nsfw`, `religious`, `political`, `racist`, `sexist`, and `explicit`; categories, language, and `type=single` further constrain the result. Safe mode is not an absolute guarantee: the documentation explicitly allows for human error. [Official documentation](https://jokeapi.dev/#safe-mode), [blacklist/filter documentation](https://jokeapi.dev/#blacklist-flags), [authentication/rate documentation](https://jokeapi.dev/#getting-started).

**Response shape:** JSON is the default. A successful single joke has fields like:

```json
{
  "error": false,
  "category": "Spooky",
  "type": "twopart",
  "setup": "Why didn't the skeleton go for prom?",
  "delivery": "Because it had nobody.",
  "flags": {
    "nsfw": false,
    "religious": false,
    "political": false,
    "racist": false,
    "sexist": false,
    "explicit": false
  },
  "id": 182,
  "safe": true,
  "lang": "en"
}
```

`type=single` returns a `joke` string instead of `setup`/`delivery`; the `flags`, `safe`, and `error` fields remain useful for defense in depth. The official `info` response currently reports version `2.3.3`, 1,368 jokes, and 183 English safe jokes. [Official endpoint response](https://v2.jokeapi.dev/joke/Any?safe-mode), [official info endpoint](https://v2.jokeapi.dev/info), [response-format/type documentation](https://jokeapi.dev/#joke-type).

**Rate/reliability:** The official documentation states a budget of **120 requests/minute per client**; excess requests receive HTTP 429. It documents `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers. It also documents 500 for internal errors and 523 when the origin is unreachable, and recommends setting a User-Agent if Cloudflare blocks a client. The documentation's linked status URL, `https://status.sv443.net/`, returned **404 Not Found** during this check; that is a monitoring-page availability issue, not evidence that the API endpoint is down. [Official rate-limit/status-code documentation](https://jokeapi.dev/#rate-limiting), [official status URL](https://status.sv443.net/).

**Tone assessment:** **Appropriate, with local safeguards.** Restricting categories to `Misc,Programming,Pun`, requesting `single`, and using both `safe-mode` and all documented blacklist flags is the strongest server-side option found. Still reject overlong or unexpected text locally because the service disclaims perfect safety filtering.

## 2. Chuck Norris API

**Exact HTTPS requests:**

```text
GET https://api.chucknorris.io/jokes/random?category=dev
GET https://api.chucknorris.io/jokes/categories
```

The official site describes this as a free JSON API for hand-curated Chuck Norris facts. It documents random, category-random, category-list, and free-text search endpoints. No API key or authentication flow is described, and the endpoint returned successfully without credentials during this check. [Official API documentation](https://api.chucknorris.io/).

**Response shape:** A random response is a JSON object. The official documentation shows `icon_url`, `id`, `url`, and `value`; the endpoint response observed during this check also included `created_at` and `updated_at` timestamp strings. The observed `dev` response included:

```json
{
  "created_at": "2020-01-05 13:42:19.104863",
  "icon_url": "https://api.chucknorris.io/img/avatar/chuck-norris.png",
  "id": "mmwqlubbs5-eh2zqbndzeg",
  "updated_at": "2020-01-05 13:42:19.104863",
  "url": "https://api.chucknorris.io/jokes/mmwqlubbs5-eh2zqbndzeg",
  "value": "Chuck Norris solved the halting problem."
}
```

The full documented example includes all four fields. Categories are plain strings; the official list includes `dev`, `science`, `movie`, `political`, `religion`, and `explicit`, among others. [Official random response](https://api.chucknorris.io/jokes/random?category=dev), [official category response](https://api.chucknorris.io/jokes/categories).

**Filtering/moderation:** Category selection (`?category={category}`) and free-text search (`/jokes/search?query={query}`) are documented. There is no documented safe mode, blacklist, profanity filter, or maximum-length control. Avoid the `explicit`, `political`, and `religion` categories and apply a local length/content check.

**Rate/reliability:** The official API page does not publish a numeric rate limit, quota, SLA, retry policy, or authentication-based limit, and the observed response exposed no rate-limit headers. The official status page reported all services online, including the API, at the time checked (Sep 13, 2026 04:43 UTC). Treat the absence of a published limit as unknown—not unlimited—and use low frequency, timeouts, caching, and backoff. [Official status page](https://status.chucknorris.io/).

**Tone assessment:** **Appropriate for a comic/geek sidebar** when restricted to `dev` or similarly benign categories and locally length-capped. It is not suitable where a hard non-offensive guarantee is required because the API documents no moderation control and exposes an `explicit` category.

## 3. Evil Insult API

**Exact HTTPS request:**

```text
GET https://evilinsult.com/generate_insult.php?lang=en&type=json
```

The official API documentation says `lang` is optional (default English) and `type` supports `text`, `XML`, and `JSON` (default plain text). No authentication requirement is documented, and the endpoint returned JSON without credentials during this check. [Official API documentation](https://evilinsult.com/api/).

**Response shape:** JSON is an object containing string fields `number`, `language`, `insult`, `created`, `shown`, `createdby`, `active`, and `comment`. The official example includes the insult text “You're a failed abortion whose birth certificate is an apology from the condom factory.” An observed response included `"insult": "You are the reason shampoo comes with use instructions."`. XML and plain-text response modes are also documented. [Official JSON endpoint response](https://evilinsult.com/generate_insult.php?lang=en&type=json), [official XML endpoint response](https://evilinsult.com/generate_insult.php?lang=en&type=xml).

**Filtering/moderation:** The official documentation lists only language and output type. It documents no safe mode, category allowlist, blacklist, profanity filter, or moderation/safety guarantee.

**Rate/reliability:** The official API documentation publishes no numeric rate limit, quota, SLA, retry behavior, or outage/status endpoint. The generation endpoint was reachable during this check. Do not infer reliability or unlimited usage from that single response.

**Tone assessment:** **Not appropriate by default** for a non-offensive comic tone. Even if an individual result is mild, the official documentation's own example demonstrates severe personal abuse and there is no server-side safety control. It should only be considered for an explicitly insult-oriented mode with strict local moderation, or omitted entirely from a general-purpose sidebar.

## 4. icanhazdadjoke (Joke Alternative)

**Exact HTTPS request:**

```text
GET https://icanhazdadjoke.com/
Accept: application/json
User-Agent: phrase-sidebar/1.0 (contact URL or email)
```

The official API documentation says no authentication is required. It selects JSON, plain text, or HTML through the `Accept` header and asks API clients to provide a descriptive custom User-Agent. [Official API documentation](https://icanhazdadjoke.com/api).

**Response shape:** A random JSON response is:

```json
{
  "id": "R7UfaahVfFd",
  "joke": "My dog used to chase people on a bike a lot. It got so bad I had to take his bike away.",
  "status": 200
}
```

The documented search endpoint is `GET https://icanhazdadjoke.com/search` with optional `page`, `limit` (maximum 30), and `term` parameters. Search JSON contains pagination fields plus `results[]` entries with `id` and `joke`, along with `search_term`, `status`, `total_jokes`, and `total_pages`. [Official random response/documentation](https://icanhazdadjoke.com/api#fetch-a-random-dad-joke), [official search documentation](https://icanhazdadjoke.com/api#search-for-dad-jokes).

**Filtering/moderation:** Search `term` is the only documented content selection control; the API documentation provides no safe mode, blacklist, profanity filter, or family-friendly guarantee. It is a dad-joke corpus, and the official examples are mild, but the plugin should still length-cap and optionally reject local policy terms before display.

**Rate/reliability:** The official API documentation does not state a numeric rate limit, quota, SLA, retry policy, or status endpoint. It does state the search-result maximum `limit=30` and requests a custom User-Agent for monitoring and abuse identification. In the official endpoint response observed during this check, headers reported `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 99`, `X-RateLimit-Reset: 1789274785`, and `Retry-After: 60`; treat these as observed service headers rather than a documented contract. Use one request per refresh, caching, timeout, and backoff. The documented endpoint was reachable during this check. [Official API documentation](https://icanhazdadjoke.com/api).

**Tone assessment:** **Good alternative** for a light comic sidebar, and simpler to consume than a two-part joke. It is not a hard safety guarantee, so local moderation remains necessary. No quote-specific API was needed because this provides a documented joke alternative with a directly usable JSON shape.

## Suggested integration policy

1. Prefer JokeAPI with the exact restricted-category request above.
2. Fall back to Chuck Norris `category=dev`, then icanhazdadjoke JSON.
3. Parse and validate the expected text field; reject missing, non-string, or overlong values and normalize whitespace.
4. Never use Evil Insult as an automatic fallback for a general/non-offensive sidebar.
5. Cache the last accepted phrase, honor `Retry-After` where supplied, and use bounded timeouts/backoff for every remote call.
