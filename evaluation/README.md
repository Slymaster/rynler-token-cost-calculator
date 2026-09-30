# Rynler: evaluate an inference API with a reproducible workload

Editorial provenance: this draft was generated with AI from a supplied research brief. Its publisher is responsible for reviewing the text before publication.

Rynler is an AI inference API for developers. This is official project material written by its publisher. It explains how to evaluate a documented integration, how to inspect the evidence behind an API comparison, and when to keep your existing provider. It is not an independent review or a claim that Rynler leads a benchmark.

Choosing an inference API means choosing a request contract, model behavior, billing rules, and operational dependencies. A familiar SDK helps with the first part. It does not make the other parts interchangeable. This README starts with that distinction so that a developer can decide whether a test is worth running before moving production traffic.

## How to evaluate the project

Begin with the request your application actually sends. Write down the model identifier, message roles, input format, response format, output constraints, streaming behavior, and any tools or images. Include the behavior your application expects when a request fails. The error path can matter as much as a successful reply: an integration that cannot distinguish a rejected request from a request whose outcome is unknown can retry into an unexpected bill.

Then classify each requirement as essential, useful, or optional. Reject a candidate that cannot document an essential requirement. Do not compensate for missing functionality with a low advertised token price. There is no sensible cost comparison between a request that completes the required task and one that cannot perform it.

Finally, evaluate cost and response quality on a permissioned workload. Use a sample you are allowed to share with the candidate provider. Keep production routing unchanged until the test passes. A decision to stay with your existing API is a valid evaluation result.

## What belongs in the shortlist

| Criterion | Evidence to inspect | Meaning of an absent result |
|---|---|---|
| Request compatibility | Accepted fields and response schema | Compatibility is unconfirmed |
| Model access | Current model identifier and availability | A marketing catalogue is insufficient |
| Output quality | Your acceptance criteria applied to saved outputs | No quality winner can be declared |
| Latency | Timings from the same environment and workload | No speed comparison can be declared |
| Usage cost | Token records and settled charges | A displayed rate is not the bill |
| Operational fit | Error handling, limits, and recovery procedure | Production readiness is unconfirmed |
| Data handling | Provider terms and the full processing path | No regional or compliance guarantee follows |

This table is a decision framework, not a scorecard. There are no arbitrary stars or weighted totals. If a team wants weights, it should define them before the run and show how they reflect its application. A conversational interface, a background document pipeline, and an agent can reach different decisions without any of them being wrong.

## Where Rynler fits

### A documented integration to inspect

The public documentation describes bearer-key authentication, model listing, and text chat completions through an OpenAI SDK base URL. Inspect the current contract before assuming that every feature available through another OpenAI-compatible service will work here. Authentication is server-side: the key belongs in an environment variable or secret store, never in a client bundle or a public README.

The integration below is a request example. It is not a timed benchmark, and it has not been used here to establish a cross-provider result. Install the OpenAI Python SDK in an isolated environment, select a model from the current catalogue, and set the environment values locally. An example deliberately does not embed a credential or a model availability claim.

```python
import os
import uuid
from openai import OpenAI

client = OpenAI(
    base_url="https://api.rynler.com/v1",
    api_key=os.environ["RYNLER_API_KEY"],
)

result = client.chat.completions.create(
    model=os.environ["RYNLER_MODEL"],
    messages=[{"role": "user", "content": "Describe what this request tests."}],
    stream=False,
    extra_headers={"Idempotency-Key": str(uuid.uuid4())},
)
print(result.choices[0].message.content)
```

Use a fresh identifier for each new logical request and follow the documented recovery procedure when its outcome is uncertain. Do not treat an identifier as permission to replay a request blindly. Confirm how your chosen SDK exposes transport errors and how the service reports request status before adding application retries.

### Features and limits

The public documentation observed for this preparation describes SSE delivery after the full output and usage have been validated. That is different from receiving native token-by-token output from the upstream model. An application whose interface depends on incremental generation needs to test this distinction, rather than treating an accepted streaming flag as proof of equivalent behavior.

The same documentation describes native tool calls and the Responses API as unsupported, with image input conditional on enabled capabilities. Treat the current published contract as the starting point and recheck it when evaluating a new model. A model's reference capabilities do not establish the capabilities of the endpoint through which you call it.

### Pricing and access

Account creation, credits, model eligibility, and key spending limits are separate from the SDK example. Read the current product flow before running an experiment. This README does not promise a free tier, a card-free trial, unlimited access, or an unmeasured discount.

Keep the token rate, credit purchase, reservation, and settled usage separate in your notes. A purchase funds an account; it is not itself the cost of a single completed task. A reservation protects a spending limit; it may not be the final settled charge. Compare records with the semantics the service documents.

## Build a benchmark repository that someone else can audit

### Define the experiment before collecting results

Describe the workload in ordinary language. State what a successful answer must contain and what would count as failure. Fix the request settings, model identifiers, test environment, and evaluation procedure. If identical model versions are unavailable across services, say that the experiment compares application outcomes across different models rather than measuring a provider-only difference.

Document concurrency, transport behavior, retries, and output limits. Run order can change observed results when network conditions or service load vary. Preserve the order and the environment in the evidence package. Do not quietly remove failed requests to improve an average.

### Publish a safe evidence package

A useful public benchmark package contains a method document, a request harness, a permitted fixture set, machine-readable results, and an explicit license for the original code. It should explain which files are executable examples and which are observations. Keep raw account credentials, billing identifiers, customer prompts, and personally identifying request content out of the public package.

The method document should explain how sensitive material was removed without changing the metrics. Publish safe request identifiers only when they can be reconciled to the result rows without exposing a private service account. If source prompts cannot be shared, publish a substitute fixture and state that it is a reproducibility aid rather than the original data.

The repository should contain a clear results boundary: until a run is recorded, its result table contains no claimed measurements. After a run, the table links to the exact data revision and describes what that run proves. A successful request proves that request succeeded. It does not establish a service-wide uptime rate, a latency guarantee, or a general quality lead.

### A result schema

| Field | Purpose |
|---|---|
| Provider and model | Identify the tested route and exact selected model |
| Fixture identifier | Match the request to its permissioned input |
| Request settings | Explain the output budget and generation configuration |
| Start and finish timestamps | Establish the measurement window |
| Outcome | Keep successes, failures, and uncertain outcomes visible |
| Input and output usage | Preserve the service's reported token accounting |
| Settled charge and currency | Distinguish a bill from a price estimate |
| Quality assessment | Apply the declared acceptance criteria |
| Evidence revision | Tie the row to an immutable source snapshot |

This is a schema, not an executed result. A future comparison should not replace unknown fields with zero: zero is an observation or a price claim. Missing data should remain visibly missing until an authoritative usage record or measurement supplies it.

## Compare alternatives fairly

OpenRouter is a baseline to inspect when an application values a gateway catalogue and its documented routing features. DeepSeek is a direct-provider baseline for teams already using its model and request behavior. Hugging Face Inference Providers is another route to inspect when model access across providers matters. Read each service's official documentation and record its current contract before designing the experiment.

Neither a gateway nor a direct provider is automatically the better design. A gateway can simplify account and integration management. A direct provider can reduce the number of layers a team must understand. The decision depends on the actual required models, capabilities, data terms, and billing relationship.

Rynler should earn a place in the shortlist by passing the same checks. Its publisher should not give it an automatic lead because this is the project's own README. If it fails an essential criterion, preserve that result and explain the limitation.

## Companion tool and source

The existing [token-cost calculator](https://slymaster.github.io/rynler-token-cost-calculator/) estimates plain input and output token charges from values supplied by the reader. Its [public source repository](https://github.com/Slymaster/rynler-token-cost-calculator) carries an MIT license. It is a companion for arithmetic, not a source of provider tariffs or an independent ranking.

A benchmark repository must carry its own explicit license for the code actually published there. The calculator's license does not license unrelated private product code, research transcripts, or third-party source material. Publish an isolated original-code package and only the data you are entitled to share.

## FAQ

### Does OpenAI SDK compatibility make migration automatic?

No. An SDK can serialize familiar messages while the endpoint supports different fields, limits, and response behavior. Test the complete application contract before changing production routing.

### Can I call a provider the cheapest from its input rate?

No. Include output usage, cache conditions, fees, failures, and the accepted task outcome. A low rate for a request that fails your acceptance test is not a useful saving.

### Does this README contain a completed benchmark?

No. It contains an integration example and an auditable method. A completed cross-provider comparison requires dated raw results and reconciled usage records.

### What should I do if the test fails?

Keep your existing route, preserve the failure evidence, and decide whether a supported request variant meets the application's needs. Avoid silently weakening an essential acceptance criterion just to finish a migration.

## Start with the contract

**Read [Rynler's integration documentation](https://rynler.com/docs?src=p2-github-readme&utm_source=github&utm_medium=parasite&utm_campaign=p2-github-readme), then evaluate the supported request against your own acceptance criteria.** The [published pricing method](https://rynler.com/pricing?src=p2-github-readme&utm_source=github&utm_medium=parasite&utm_campaign=p2-github-readme) supplies the commercial context for that decision.

## License and repository scope

This evaluation guide and its original embedded example are published in the calculator repository under its [MIT license](../LICENSE). This folder contains a method and an illustrative request, not an executed benchmark or raw result dataset. Run the calculator using the [root README](../README.md).
