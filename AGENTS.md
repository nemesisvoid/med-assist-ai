# AGENTS.md

# Project AI Workflow

This repository contains specialized skills. Before starting any task, determine which skill(s) are most relevant and load their instructions.

---

## Skill Routing

### UI/UX & Product Design
Location: ./.claude/skills/ui-ux-pro-max/SKILL.md

Trigger when tasks involve:
- UI design
- UX improvements
- Dashboard design
- Landing pages
- Design systems
- Component architecture
- Accessibility
- Wireframes
- User flows
- Responsive design
- Mobile-first layouts

Keywords:
design, ui, ux, dashboard, landing page, component, layout, accessibility, mobile, responsive

---

### Senior Fullstack Development
Location: ./.claude/skills/senior-fullstack/SKILL.md

Trigger when tasks involve:
- Next.js
- React
- TypeScript
- API development
- Server Actions
- Authentication
- Authorization
- Database architecture
- Prisma
- Backend logic
- Performance optimization
- Refactoring
- Production architecture

Keywords:
nextjs, react, typescript, prisma, api, auth, database, backend, server, middleware, optimization

---

## Multi-Skill Usage

If a task spans multiple domains, load all relevant skills.

Examples:

- "Design a healthcare dashboard"
  → UI/UX Design

- "Build a healthcare dashboard in Next.js"
  → UI/UX Design
  → Senior Fullstack Development

- "Create a Prisma schema for appointments"
  → Senior Fullstack Development

- "Redesign this page and implement it"
  → UI/UX Design
  → Senior Fullstack Development

---

## Working Rules

Before making changes:

1. Understand the complete task.
2. Select the appropriate skill(s).
3. Read the corresponding SKILL.md file(s).
4. Follow all skill instructions.
5. Ask clarifying questions only when requirements are ambiguous.
6. Prefer production-ready solutions over quick hacks.
7. Explain major architectural decisions.

---

## Code Standards

Always:

- Use TypeScript.
- Prefer strict typing.
- Avoid unnecessary complexity.
- Follow existing project conventions.
- Write maintainable and scalable code.
- Keep components focused and reusable.
- Prioritize readability over cleverness.
- Consider performance implications.

---

## UI Standards

When building interfaces:

- Mobile-first approach.
- Accessible by default.
- Consistent spacing.
- Consistent typography.
- Modern and professional appearance.
- Clear visual hierarchy.
- Good loading and error states.
- Responsive across screen sizes.

---


### Healthcare Features
- Follow HIPAA-conscious design patterns.
- Protect sensitive patient information.
- Use role-based access control.
- Audit important actions when applicable.

---

## Output Expectations

Generated solutions should be:

- Production-ready.
- Scalable.
- Secure.
- Well-structured.
- Easy to maintain.
- Consistent with the existing codebase.