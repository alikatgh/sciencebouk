# Black-Scholes lesson copy

<!-- Keep the ## step ids stable. Edit the Markdown below freely. -->

## strike-price
### instruction
The blue curve is the call option price. Drag the strike price K to see how it affects the option value. Higher K means the right to buy is less valuable (you'd have to pay more).

### hint
Drag the blue K in the formula to change the strike price. Watch how the call curve shifts.

### insight
The call option (right to BUY) gets cheaper as the strike price rises, because a higher strike means you'd pay more to exercise. The put option (right to SELL) does the opposite. The dashed lines show the "intrinsic value" -- what the option would be worth if it expired right now.

## volatility
### instruction
Now drag volatility (sigma) upward. This is the key insight of Black-Scholes: uncertainty has measurable value.

### hint
Increase the yellow sigma. Watch both curves rise.

### insight
Higher volatility means the stock price could swing wildly. For an option buyer, this is pure upside -- if the stock goes way up, you profit; if it goes way down, you just don't exercise. More uncertainty = more valuable options. This is why options get expensive before earnings reports.

## time-decay
### instruction
Drag T (time to expiry) toward zero. Watch how the smooth option price curve approaches the sharp "hockey stick" of intrinsic value.

### hint
Decrease the green T toward 0.01 and watch the curves change shape.

### insight
As expiration approaches, the "time value" of the option evaporates. The smooth curve collapses into a sharp corner at the strike price. This is "theta decay" -- options lose value every day just from the passage of time. The Black-Scholes formula quantifies exactly how much.
