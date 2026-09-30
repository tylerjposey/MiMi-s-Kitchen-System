---
name: Profitability status history
description: Why cost-increase flags require a recorded baseline rather than an inferred one.
---

Only report a Cost Increase when a menu recipe has a recorded cost baseline from a save and the latest cost exceeds that baseline. Earlier recipes without such a baseline have unknown history; do not treat their current cost as evidence of an increase. A selling-price-only update must not reset the recipe-cost baseline. Margin-based warnings can still be computed from current data, with Low Margin taking precedence over other status labels.

**Why:** Current ingredient prices alone cannot establish whether they rose since an older recipe was created. Labeling an unmeasured change as an increase would give the owner a misleading alert. Changing a price does not acknowledge or rebaseline ingredient costs, so resetting the baseline then would erase a measured increase.

**How to apply:** When adding historical profitability alerts or changing status rules, distinguish missing history from a measured change. Do not backfill a baseline from today's cost and present it as historical evidence. Keep pricing-only edits separate from recipe saves.