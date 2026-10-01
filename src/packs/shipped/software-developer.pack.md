---
pack: Software Developer
interview:
  company: Brightwater Health (fictional)
  jobSpec: |
    Brightwater Health is looking for a Software Developer to join the team that builds our appointment booking
    platform. You'll write and review TypeScript and SQL, improve the speed and reliability of our APIs, and keep our
    test suite fast and trustworthy. You'll work closely with designers and other developers, and sometimes speak to
    clinic staff to understand how they use what we build.
questions:
  - text: Tell me about a time you made a slow part of a system faster.
    skill: performance
  - text: Describe a bug that was hard to track down, and how you found it.
    skill: debugging
  - text: Tell me about a time you disagreed with a teammate about a technical approach.
    skill: collaboration
  - text: Tell me about a time you made a codebase easier to work in.
    skill: code quality
  - text: How do you make sure your changes are safe to release?
    skill: testing
  - text: Tell me about a time you worked directly with users to understand what they needed.
    skill: user focus
---

# Example Scenario

---
title: Cut the booking search API's response time by two thirds
role: Software developer
skills: [performance, databases]
measurableResults: [p95 response time from 1.8 s to 600 ms]
---

## Situation

The booking search API had got slower as more clinics joined. Its slowest five percent of requests took 1.8
seconds, and the front end showed a spinner on every search.

## Task

Make search fast again without changing what it returned.

## Action

I measured where the time went and found one query running once per clinic in the results. I rewrote it as a single
query with a join, added an index on the appointment date, and compared the old and new results on a copy of real
data before switching.

## Result

The slowest five percent of searches went from 1.8 seconds to 600 milliseconds, and the results were identical.

# Example Scenario

---
title: Found the race condition behind double bookings
role: Software developer
skills: [debugging, concurrency]
measurableResults: [Double bookings from about 4 a week to 0]
---

## Situation

About four times a week, two patients were booked into the same appointment slot. Nobody could reproduce it, and it
had been open as a bug for two months.

## Task

Find out why it happened and stop it.

## Action

I added logging around the booking code and noticed that every double booking had two requests less than 50
milliseconds apart. I wrote a test that sent two bookings at once, which failed every time, then moved the
availability check and the insert into one database transaction with a unique constraint on the slot.

## Result

The test passed, and there have been no double bookings since the fix went live.

# Example Scenario

---
title: Settled a disagreement about caching with a written comparison
role: Software developer
skills: [collaboration, technical decisions]
measurableResults: [Decision made in 2 days instead of a week of review comments]
---

## Situation

A teammate and I disagreed in a code review about whether to cache clinic opening hours in the browser or on the
server. The review had gone back and forth for a week.

## Task

Reach a decision we both trusted, without it becoming personal.

## Action

I suggested we each write half a page on our option, with its costs, and share it with the team. We agreed on what
mattered most beforehand: how quickly a clinic's change of hours shows up for patients.

## Result

Reading both side by side, we chose server caching with a five-minute expiry, which was my teammate's option. The
decision took two days, and the team now uses the same short write-up for other disagreements.

# Example Scenario

---
title: Made a flaky test suite trustworthy again
role: Software developer
skills: [testing, code quality]
measurableResults: [Flaky failures from about 1 in 5 runs to fewer than 1 in 100, Suite time from 14 to 6 minutes]
---

## Situation

About one test run in five failed for no real reason, so developers had started re-running failures without reading
them. Two real bugs had reached production that way.

## Task

Make a failing test mean something again, so changes could be released with confidence.

## Action

I tracked which tests failed most often and found most of them waited on fixed timers or shared one database. I gave
each test its own database schema, replaced the timers with waits for the actual result, and split the slowest
tests to run in parallel. I also added a rule that a flaky test is fixed or removed within a week.

## Result

Flaky failures dropped from about one run in five to fewer than one in a hundred, and the suite went from 14 minutes
to 6. Developers went back to reading failures before merging.
