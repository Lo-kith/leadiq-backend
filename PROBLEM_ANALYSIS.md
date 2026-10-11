# Problem Analysis: Real-World LeadIQ Challenges & Solutions

This document analyzes the real-world problems the LeadIQ application faced and how our changes address them.

## Real-World Problems

### 1. "Presence ? Fit" Scoring Bias

**Real-world issue**: Sales teams waste time on leads that look complete (full contact info, website) but aren't a good fit for their ICP (Ideal Customer Profile). The old scoring heavily rewarded data completeness - a non-target company with all fields filled could score High.

**Impact**: False positives, wasted outreach time, lower conversion rates.

**Solution**: Reweighted scoring to prioritize fit (industry, size, revenue) over presence. Introduced fit/quality split with fitRatio multiplier - quality points scale down if fit signals are missing. Added persona scoring to identify decision-makers.

### 2. Missing Decision-Maker Context

**Real-world issue**: "Contact name" alone isn't enough. Reaching out to an engineer when you need the VP of Sales is ineffective. Job titles reveal authority.

**Impact**: Poor outreach targeting, lower response rates.

**Solution**: Added jobTitle throughout the stack with persona scoring (decision-maker roles get full points, others 40%, missing title flagged). Displayed in UI and CSV import/export.

### 3. Bad Data & Deliverability

**Real-world issue**: Invalid email domains hurt sender reputation; dead websites waste time. Sales teams need quick validation.

**Impact**: High bounce rates, poor list quality.

**Solution**: Enrichment checks MX validity (dns.resolveMx) and website status with SSRF protections. Caches results (7 days). Auto-flags leads with invalid MX domains for follow-up.

### 4. Performance & Reliability

**Real-world issue**: Bulk operations can overwhelm external services; unvalidated requests create SSRF/security risks; caching is essential for repeated lookups.

**Impact**: Timeouts, rate limits, security vulnerabilities.

**Solution**: Concurrency-limited enrichment (mapLimit with max 5), 5s timeouts, 200KB cap, SSRF guard blocking private/loopback/link-local IPs. Mongo TTL cache avoids repeated lookups.

### 5. UX & Accessibility Gaps

**Real-world issue**: Sales reps need efficient workflows - keyboard navigation for speed, clear confirmation before destructive actions, focus management for screen readers, responsive bulk actions, clear loading states.

**Impact**: Slower workflows, accessibility barriers, accidental deletions.

**Solution**: Custom ConfirmDialog, Drawer focus trap/restore, keyboard-accessible table rows, skeleton loading, bulk enrich in one click, improved import with inline edits and invalid-row export.

## Key Takeaways

- Fit > Presence: Restructured scoring to reflect ICP fit
- Quality data: Enrichment catches basic validity issues early
- Safety first: SSRF protection, timeouts, validation
- Accessible by default: Keyboard nav, focus management, ARIA-friendly UI
- Real-world workflows: Bulk operations, caching, confirmations
