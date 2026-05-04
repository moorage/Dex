---
name: "incident-review"
description: "Post-mortem on incidents"
---

# incident-review

Post-mortem on incidents

## Purpose

Document incident learnings through structured post-mortem to prevent recurrence.

## Usage

- `/incident-review [incident-name]` - Review specific incident

---

## Steps

1. **Gather incident context:**
   - Timeline of events
   - Systems affected
   - Customer impact
   - Duration/downtime

2. **Prompt for root cause analysis:**
   - What happened?
   - Why did it happen?
   - Why wasn't it caught earlier?

3. **Identify action items:**
   - Immediate fixes
   - Long-term prevention
   - Monitoring improvements
   - Process changes

4. **Create post-mortem document** in 06-Resources/Learnings/

---

## Output Format

```markdown
# Incident Post-Mortem: [Incident]

**Date:** [When occurred]
**Duration:** [Length]
**Severity:** [Critical/Major/Minor]

## Impact
- **Users affected:** [Count/percentage]
- **Services impacted:** [List]
- **Business impact:** [Description]

## Timeline
- [Time] - [Event]
- [Time] - [Event]

## Root Cause
[Analysis of why this happened]

## Action Items
- [ ] [Immediate fix] - Owner: [Name] - Due: [Date]
- [ ] [Prevention measure] - Owner: [Name] - Due: [Date]

## What We Learned
1. [Learning 1]
2. [Learning 2]
```
