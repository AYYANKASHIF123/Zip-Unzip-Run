---
name: OpenAPI codegen safety
description: Strict YAML parsing and generated-output behavior to account for before changing API schemas.
---

Validate that OpenAPI component keys are unique before running code generation. Python's YAML parser may accept duplicate keys that Orval's YAML parser rejects. Orval cleans its generated output directories before parsing, so an invalid spec can leave generated clients deleted until codegen succeeds.

**Why:** A duplicate schema key caused codegen to fail after cleanup; strict parsing identified the issue and successful regeneration restored the generated files.

**How to apply:** After editing `lib/api-spec/openapi.yaml`, validate it with a strict YAML parser and run `pnpm --filter @workspace/api-spec run codegen` before checking dependent packages.
