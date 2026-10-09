---
title: "From $200 to $30: Five Layers of LLM Cost Optimization"
description: "A working map of the five places LLM spend actually leaks — routing, context, caching, output discipline, and scheduling — with concrete numbers for each layer."
tags: ai, llm, engineering, performance
published: false
---

Every team that ships an LLM feature eventually opens the bill and discovers they're paying enterprise prices for toy traffic. The good news: the leaks are well understood, and they stack. Here are the five layers, cheapest wins first.

## Layer 1: Model routing (usually 40–70% of the savings)

Not every request deserves your best model. A workload decomposes into tiers:

- **Tier A — hard reasoning, code architecture, judgment calls**: your strongest model.
- **Tier B — routine generation, summarization, structured extraction**: a mid model at a fraction of the price.
- **Tier C — classification, labeling, short transforms, moderation**: the cheap tier.

A typical RAG or agent workload is 60–80% Tier C by request count. If everything routes to the flagship, you're paying flagship prices for label duty. One team I read about cut $200/month to under $80 with routing alone — same quality, because Tier C tasks never needed Tier A brains.

The engineering is boring and effective: a `route(taskType)` function, per-tier model config, and a fallback path when the cheap model returns garbage.

## Layer 2: Context discipline (20–40%)

Tokens in are billed even when they're useless. The classics:

- **Stop resending the world.** Chat history grows quadratically if you append blindly. Trim, summarize, or window it.
- **Cut the blob before you embed it.** A 40-page PDF where 3 pages matter costs 40 pages of input *every single call*.
- **Structured prompts over essay prompts.** Long instructions are expensive context; tight schemas are cheap and parse better.

Rule of thumb: audit one day of prompts, print the token count of each section, and delete what doesn't change the answer. Teams routinely find 30–50% pure boilerplate.

## Layer 3: Cache what you repeat (10–30%)

If your prompt has a stable prefix — system instructions, tool definitions, retrieved documents — provider caching discounts it on repeat calls. Cache-friendly prompt design (stable prefix first, variable parts last) is often a one-afternoon change with a permanent discount attached.

Same idea at the application layer: identical inputs should never hit the model twice. A hash-keyed response cache handles retries, demos, and eval runs for free.

## Layer 4: Output discipline (10–25%)

Output tokens cost several times input tokens. Stop paying for prose you don't read:

- **Ask for JSON, not essays.** "Return 3 fields" beats "explain your reasoning" when you don't store the reasoning.
- **Cap `max_tokens` per task type.** An unbounded generator will use the budget you give it.
- **Short system personas.** A 900-token personality prompt on a classification call is pure waste.

One caution: don't strip reasoning from tasks that genuinely need it — strip it from tasks where you only ever read the verdict.

## Layer 5: Scheduling (5–15%)

The quiet layer. Batch endpoints, off-peak jobs, and request coalescing (N identical user queries → 1 model call) shave the last slice. For agents: cache tool results, and stop loops that retry expensive calls on cheap failures. A retry storm on a $15/1M-output model is a self-inflicted denial-of-wallet attack.

## The order that works

1. Measure one week of real traffic: tokens in, tokens out, per route.
2. Route Tier C down (day one, biggest win).
3. Fix the worst prompts by input volume (day two).
4. Enable caching, cap outputs, coalesce.
5. Re-measure. Repeat until the curve flattens.

None of this requires a new platform — it requires looking at the bill with the formula in front of you:

```
cost = input tokens / 1M × input rate + output tokens / 1M × output rate
```

*Every layer above is a variable in that formula. If you want to check the arithmetic on your own numbers without sending them anywhere, [Rynler's browser-only calculator](https://github.com/Slymaster/rynler-token-cost-calculator) does exactly this — your rates, your counts, your browser. [Rynler](https://rynler.com/pricing?src=p3-article-five-layers) also applies these layers on the platform side for teams who'd rather not run the plumbing themselves.*
