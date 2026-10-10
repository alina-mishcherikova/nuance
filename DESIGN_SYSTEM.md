# Nuance design system

Original warm typography-first composition; no borrowed brand assets. Ivory `#f5f1e8`, ink `#252821`, terracotta `#a8432c`, paper `#eee8dc`; dark uses charcoal `#20231f`, cream `#f2eee3`, warm peach `#e5a18c`. Theme tokens in globals.css map to Tailwind/shadcn conventions. System Arial/Helvetica sans avoids external network font dependencies. Large compact headings, restrained uppercase captions, asymmetrical question card and solid offset shadow; no gradients/glass.

Spacing uses 4/8px rhythm with 20–32px card gutters; 48px minimum buttons, 44px preference/navigation targets. Thin visible borders, 3px accent focus outline, semantic links/buttons/labels and native form controls. Customized shadcn-style Button (CVA + Radix Slot), Radix Dialog with focus trap/return and Escape dismissal. No quiz card implies an available quiz: the editorial sample is an unanswerable conversation prompt and inactive catalog copy is explicit.

Mobile starts at 320px, single-column hero/cards/steps, wrapping localized navigation. Desktop is a two-column asymmetric hero. No fixed-height text boxes. Theme preference follows system initially and persists via next-themes; locale navigation retains pathname. Theme preference is nonsensitive local storage; auth credentials never use it.

Reduced motion removes animations/transitions and smooth scrolling. Loading uses a labeled status plus hidden skeleton, auth errors use linked field descriptions and alert, successful operations use status. Home catalog has a truthful empty state. Every implemented string has complete EN/UK/FR keys, including email copy. Browser axe/keyboard/mobile evidence is recorded in IMPLEMENTATION_PLAN.md; automated checks are not a WCAG certification.
