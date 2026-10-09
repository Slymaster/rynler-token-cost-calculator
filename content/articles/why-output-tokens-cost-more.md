---
title: "Why Output Tokens Cost 5x — And What It Does to Your Bill"
description: "Output tokens are priced several times higher than input tokens on every major model. That asymmetry is not marketing — it's compute. Here is the physics, the math, and how to design around it."
tags: ai, llm, engineering, webdev
published: false
---

Look at any modern model's rate card and you'll see the same asymmetry: output tokens cost roughly 3–5× input tokens. Claude prices output at 5× input on several tiers. Gemini, GPT, DeepSeek — same shape. It looks like premium pricing. It's actually physics.

## Reading is parallel. Writing is serial.

Processing your prompt is a **prefill** phase: the model reads the whole context in essentially one parallel sweep. Ten thousand input tokens get digested together — big matrix multiplications, hardware saturated, efficient.

Generating an answer is a **decode** phase: each token depends on the previous one. Token 500 cannot be computed until token 499 exists. The hardware that just chewed 10,000 tokens at once now dribbles them out one at a time, each step paying full memory bandwidth for a full forward pass.

That's why the price asymmetry exists: **input tokens are read in bulk; output tokens are written in sequence**. The compute per output token is genuinely higher, so the rate card reflects the hardware, not greed.

## What it does to naive estimates

People estimate cost by "how much text goes through the model." Wrong variable. The right split:

```
cost = input tokens / 1M × input rate + output tokens / 1M × output rate
```

Consider a mid-tier model at $3 / 1M input and $15 / 1M output (a 5× ratio).

- **Extraction task**: 50k input → 500 output. Cost: 50×$3/1M... precisely: `0.05×3 + 0.0005×15 = $0.15 + $0.0075 ≈ $0.16`. Input-dominated.
- **Generation task**: 2k input → 4k output. Cost: `0.002×3 + 0.004×15 = $0.006 + $0.06 = $0.066`. **Output is 91% of the bill on a 10× smaller request.**

Same model, same "size" of job. The extraction is input-priced; the generation is output-priced. If your cost model assumes a flat ratio between the two, every generation-heavy route in your app is mispriced in your forecasts.

## The three design responses

**1. Pay for answers, not essays.** If you consume a JSON field, request a JSON field. "Think step by step then explain" on a classification endpoint is paying 5× rates for text that goes to `/dev/null`. Cap `max_tokens` per task; an unbounded generator will spend the budget you leave on the table.

**2. Offload to the cheap side.** Anything that can be an input-side transform — formatting, validation, prompt assembly, template rendering — belongs in your code, not in a generation. The cheapest output token is the one never generated.

**3. Right-size the model per output length.** Short-output tasks (labels, routing, sentiment) don't need a premium decoder. Long-output tasks (reports, code) are where quality differences justify rates. Map your routes by *expected output length*, not by "importance."

## The second-order effect: conversation

In chat-style workloads, output compounds. Each generated turn becomes *input* on the next turn. A long-winded assistant is therefore expensive twice: 5× rate on generation, then again as context on every subsequent call. Terse, structured answers are cheaper forever.

## The habit that fixes forecasts

Split your dashboard into **input spend** and **output spend** from day one. Teams that track "total tokens" can't see this asymmetry; teams that track the split find their generation-heavy routes in the first week — and they're always where the money went.

*Want to check these numbers against your own workload? [Rynler's token-cost calculator](https://github.com/Slymaster/rynler-token-cost-calculator) runs the formula in your browser — your rates, your counts, nothing leaves the tab. Method and source are public, MIT-licensed.*
