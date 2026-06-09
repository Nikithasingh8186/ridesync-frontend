# Contributing to RideSync

## Branch Strategy

main           ← stable, demo-ready only
dev            ← integration branch
person1/backend
person2/frontend

## Workflow

1. Always pull latest dev before starting
git checkout dev
git pull origin dev

2. Work on your branch
git checkout person1/backend

3. Commit often
git add .
git commit -m "feat: add match scoring endpoint"

4. Push your branch
git push origin person1/backend

5. Merge into dev when feature is ready
git checkout dev
git merge person1/backend
git push origin dev

## Commit Message Format

feat:   new feature
fix:    bug fix
ui:     frontend changes
api:    backend/API changes
db:     database/model changes
docs:   documentation only

## Examples

feat: add AI suggestion endpoint
fix: correct seats_available on booking cancel
ui: polish ride card match score badge
api: connect FindRide to /rides/match
db: add is_recurring field to rides table

## Sync Points

- Every 6 hours: merge both branches into dev and test together
- Hour 28: final feature freeze, demo prep only
- Hour 34: merge dev into main

## Code Style

- Python: follow PEP8, use type hints
- React: functional components only, no class components
- Naming: PascalCase for components, camelCase for functions
- No commented-out code in commits