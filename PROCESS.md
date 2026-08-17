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

**Using a selection of keys.** The obvious version of this explainer ships one
fixed key that always opens the lock — you'd never see what makes a key wrong.
Instead I gave the user a ring of four differently-cut keys and let them try
each one, so the same lock mechanism has to visibly reject three keys before
accepting the fourth. The outward appearance of keys can be quite subtly
different but when inserted into a lock it can make a huge difference on the
pins inside, so I drew similar-looking keys but accentuated their difference
in the pins themselves — struggling a bit with Claude to get them looking as
realistic as I wanted before settling on their current semi-realistic form. I
checked this was actually right by trying all four keys myself in the browser:
only the matching key's pins align along the shear line and unlock it, and the
other three visibly stop short.
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

**The Special Feature.** The obvious stopping point was the keyed lock alone —
it already answers the brief. Instead, since I'd always been curious how locks
are actually picked, I added a hidden 'secret mode' letting the user set each
pin by hand until it binds, the same technique real pickers use, without
showing them where the binding point is. I verified this wasn't just a
decorative toggle by picking the lock myself in the browser: setting pins one
at a time until the cylinder actually turned, which confirmed the hidden
binding logic behaves like a real pin-tumbler rather than always succeeding
(watch [LockPickingLawyer](https://www.youtube.com/c/lockpickinglawyer) on
YouTube if you never want to trust a lock again - they're ALL pickable).
([`07cec11...b07d37b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-evealitaylor/compare/07cec11...b07d37b)).
