# Opportunity Backlog

This directory contains all opportunities in our Kanban system.

## Kanban Board

### Discovery
_Opportunities being researched and validated_

| ID | Name | Priority | Project |
|----|------|----------|---------|
| _Empty_ | | | |

### Defining
_Opportunities being scoped and designed_

| ID | Name | Priority | Project |
|----|------|----------|---------|
| _Empty_ | | | |

### Building
_Opportunities in active development_

| ID | Name | Priority | Project |
|----|------|----------|---------|
| _Empty_ | | | |

### Validating
_Opportunities being tested and measured_

| ID | Name | Priority | Project |
|----|------|----------|---------|
| _Empty_ | | | |

### Done
_Completed opportunities_

| ID | Name | Completed | Project |
|----|------|-----------|---------|
| _Empty_ | | | |

### Parked
_Opportunities on hold_

| ID | Name | Reason | Project |
|----|------|--------|---------|
| _Empty_ | | | |

---

## How to Use

```bash
# Create a new opportunity
pm-opp new "Opportunity Name"

# View kanban board
pm-opp list

# Move opportunity to next stage
pm-opp move OPP-001 defining

# Decompose into feature briefs
pm-opp decompose OPP-001
```

## Stages

1. **Discovery** - Researching the problem and validating demand
2. **Defining** - Scoping the solution and creating briefs
3. **Building** - Active development work
4. **Validating** - Testing hypotheses and measuring impact
5. **Done** - Successfully completed
6. **Parked** - On hold (with reason documented)
