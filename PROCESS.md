# Process overview

## What I built

An interactive explainer of a pin-tumbler lock, the most common type of lock.
The user is given a keyring containing multiple keys with its own bitting, which
are the ridges that make each key unique. One key is selected abuts against the
cross-section of the lock. The user drags a slider which moves the key into the lock,
and the 5 pins move individually to the pattern of the key's bitting. Once the correct
key has been inserted into the lock, the pins align along the shear line allowing the
user to press a button to turn the key, which unlocks the lock. The "secret mode" allows
users to bypass the need for keys by individually moving each pin until it binds,
which is a common lock-picking technique. The user is unable to see the binding,
mimicking the experience of a lock-picker in real life. This interactive explainer
effectively shows the behaviour of the pin-tumber lock in both scenarios.

## The moments that mattered

**Using a selection of keys.** Early on I decided to gamify the experience
by allowing the user to pick from a selection of four keys and try each one
in the lock, in order to demonstrate more clearly how different keys interact
with the same lock mechanism. The outward appearance of keys can be quite subtly
different but when inserted into a lock it can make a huge difference on the pins
inside. I wanted to reflect this by drawing similar looking keys but accentuating
their difference in the pins themselves. I struggled a bit with Claude to get the
keys looking as realistic as I would have liked them, but their final form strikes
the balance of semi-realism with enhanced features to improve the demonstation.
([`d1def65...636b45c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-evealitaylor/compare/d1def65...636b45c)).

**Adding realism into the interaction.** Initially, when Claude built the key-lock
interaction, the key was sitting vertically alongside the lock, and the slider moved
the pins only and not the key. I felt that this element was lacking realism and
didn't effectively demonstrate the relationship between the key ridges and each of
the pins. It took some back and forth with Claude in order to get this right, as Claude
was unable to properly visualise the issue. I decided to reframe my explanation and approach
it from Claude's angle, where there weren't pins and locks, but rather blocks of certain shapes
and sizes printed on the screen. Once I identified the relevant elements, I described them
in terms that Claude was better able to understand, and finally grasp my intention, thus
delivering a realistic interaction.
([`6e64b3c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-evealitaylor/commit/6e64b3c)).

**The Special Feature.** While I feel I have a decent understanding
of how keys and locks interact, something which I have always been curious about
was how locks are picked and what the process is to achieve that. I decided that
given my success with the primary explainer, I wanted to add a 'secret mode' feature
of manually picking the lock, which would also aid my own understanding of how the
process works. This adds a new, hidden interaction for the user, and allows them to experience
just how easy the picking a lock actually is (watch
[LockPickingLawyer](https://www.youtube.com/c/lockpickinglawyer) on YouTube if
you never want to trust a lock again - they're ALL pickable).
([`07cec11...b07d37b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-evealitaylor/compare/07cec11...b07d37b)).
