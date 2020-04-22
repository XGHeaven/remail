## Renderer

- Macbook Pro 2017 i5
- Node.js v12.14.1
- MacOS 10.15.4

```
baseline(1e7-loop) x 179 ops/sec ±0.18% (90 runs sampled)
ReactDOM/simple-dom x 768,452 ops/sec ±0.86% (91 runs sampled)
RemailRenderer/simple-dom x 110,627 ops/sec ±5.55% (86 runs sampled)
ReactDOM/huge-dom x 14,131 ops/sec ±2.06% (95 runs sampled)
RemailRenderer/huge-dom x 11,836 ops/sec ±0.58% (96 runs sampled)
ReactDOM/todo-list x 116,392 ops/sec ±0.19% (98 runs sampled)
RemailRenderer/todo-list x 53,816 ops/sec ±1.24% (92 runs sampled)
ReactDOM/huge-component x 1,140 ops/sec ±0.87% (95 runs sampled)
RemailRenderer/huge-component x 940 ops/sec ±2.85% (93 runs sampled)
```
