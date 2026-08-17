# Assignment 1 reflection

**The breakthrough that moved the work forward.** From the first build, the key sat
vertically beside the lock and the slider only moved the pins up and down — it
didn't demonstrate why a key's ridges lift each pin by a different amount.
Claude kept missing what I wanted fixed, as I was describing it in lock vocabulary
("the key needs to slide into the keyway, ridge under pin"),
and it wasn't able to reconstruct the geometry based on how I was communicating. The
breakthrough was dropping that vocabulary entirely and re-describing the
scene as what it actually is underneath: shapes with specific widths,
heights, and positions on screen, no pins or locks in the description at all.
Once I specified it at that level, Claude finally understood, and built
the sliding, ridge-driven interaction that finally showed the relationship
between a key's cut and each pin's lift. The fix wasn't about writing a better prompt
or even fixing the harness to bend to my will, but actually to abandon the metaphor the
model was representing for the actual physical geometry Claude had built.

**What this changed about the developer I want to be.** I'd assumed that if
an explanation wasn't landing, the solution would be to repeat it more precisely
in the same terms, refining my prompt in order to get Claude to understand, which
led to frustration. This process taught me the fix is often to change the way I am
communicating entirely, remembering that no matter how well Claude speaks to me in
plain English, it is still a computer that works in very simple ways and understands
things very directly. I had to translate my mental model into vocabulary the agent
can actually comprehend, rather than relying on human-style communication. This has
helped me to notice when I'm the one who needs to reframe, instead of asking Claude
to just try harder.