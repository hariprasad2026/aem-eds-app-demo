/*
 * Canvas journey state model (pure, no DOM): decides which Canvas instance is docked in place
 * and which one owns the floating presentation, from what the observers report.
 *
 * Journey: header / start Canvas -> floating -> section Canvas (docked) -> floating ->
 * ... -> footer Canvas (docked, final stop). Only one instance floats at a time.
 */

export const STATES = Object.freeze({
  INITIAL: 'initial', // nothing reached yet (e.g. the start Canvas is below the fold)
  DOCKED_HEADER: 'docked-header', // the start Canvas (header or first on the page) is in view
  FLOATING: 'floating', // floating after the start Canvas, before any other target
  APPROACHING_TARGET: 'approaching-target', // floating, the next target is about to dock
  DOCKED_SECTION: 'docked-section', // an intermediate Canvas is in view, in place
  FLOATING_BETWEEN_TARGETS: 'floating-between-targets', // floating after an intermediate target
  APPROACHING_FOOTER: 'approaching-footer', // the footer is in view: the floating Canvas yields
  DOCKED_FOOTER: 'docked-footer', // the footer Canvas is in view: final stop, nothing floats
  DISABLED: 'disabled', // journey off (no Canvas, or the mobile menu is open)
  FALLBACK: 'fallback', // footer reached but the page has no footer Canvas
});

export const ROLES = Object.freeze({
  START: 'start',
  INTERMEDIATE: 'intermediate',
  FINAL: 'final',
  DOCK: 'dock', // the Primary (sticky) style: floats only, has no place in the page
});

/**
 * Assigns the journey roles to instances in DOM order: in the footer -> final (only the first
 * one; others become intermediate), Primary style -> dock, the first other one -> start.
 * @param {Array<{ id: string, inFooter?: boolean, primary?: boolean }>} instances in DOM order
 * @returns {Array<Object>} the instances with a role
 */
export function assignRoles(instances) {
  let hasStart = false;
  let hasFinal = false;
  return instances.map((instance) => {
    let role = ROLES.INTERMEDIATE;
    if (instance.primary) role = ROLES.DOCK;
    else if (instance.inFooter && !hasFinal) {
      role = ROLES.FINAL;
      hasFinal = true;
    } else if (!instance.inFooter && !hasStart) {
      role = ROLES.START;
      hasStart = true;
    }
    return { ...instance, role };
  });
}

/**
 * Resolves the journey state.
 * @param {Array<Object>} instances with role, in DOM order, each with
 *   - id: stable instance id
 *   - role: one of ROLES
 *   - stayInPlace: never floats (still a docking target)
 *   - visible: its place (search row) is in the docking zone of the viewport
 *   - near: its place is just below the viewport (about to dock)
 *   - passed: its place is above the viewport
 * @param {Object} env
 *   - enabled: false switches the journey off
 *   - navOpen: the mobile navigation is open
 *   - footerVisible: the semantic footer is in view
 *   - direction: 'down' or 'up' (last scroll direction)
 *   - focusedId: instance whose floating controls have keyboard focus (keeps it floating)
 * @param {{ state?: string, floatingId?: string, dockedId?: string }} [previous]
 * @returns {{ state: string, floatingId: string | null, dockedId: string | null }}
 */
export function resolveJourney(instances, env = {}, previous = {}) {
  const none = (state) => ({ state, floatingId: null, dockedId: null });
  if (env.enabled === false || !instances.length) return none(STATES.DISABLED);
  if (env.navOpen) return { ...none(STATES.DISABLED), dockedId: previous.dockedId || null };

  // never pull the controls away from under the keyboard focus
  if (env.focusedId && previous.floatingId === env.focusedId
    && instances.some((i) => i.id === env.focusedId)) {
    return { state: previous.state, floatingId: previous.floatingId, dockedId: null };
  }

  const placed = instances.filter((i) => i.role !== ROLES.DOCK);
  const final = placed.find((i) => i.role === ROLES.FINAL);

  // final stop: the footer Canvas is in place
  if (final?.visible) return { ...none(STATES.DOCKED_FOOTER), dockedId: final.id };
  // the footer is coming into view: the floating Canvas yields before it overlaps it
  if (env.footerVisible) return none(final ? STATES.APPROACHING_FOOTER : STATES.FALLBACK);

  // a Canvas is in place in view: it is docked and nothing floats
  const visible = placed.filter((i) => i.visible);
  if (visible.length) {
    const kept = visible.find((i) => i.id === previous.dockedId);
    // several in view: keep the docked one, else the first (down) or last (up) in DOM order
    const docked = kept || (env.direction === 'up' ? visible[visible.length - 1] : visible[0]);
    const state = docked.role === ROLES.START ? STATES.DOCKED_HEADER : STATES.DOCKED_SECTION;
    return { state, floatingId: null, dockedId: docked.id };
  }

  // floating: the Primary dock if the page has one, else the last Canvas scrolled past
  const dock = instances.find((i) => i.role === ROLES.DOCK);
  const passed = placed.filter((i) => i.passed && !i.stayInPlace && i.role !== ROLES.FINAL);
  const lastPassed = passed[passed.length - 1];
  const owner = dock || lastPassed;
  if (!owner) return none(STATES.INITIAL);

  const approaching = placed.some((i) => i.near && !i.passed);
  let state = STATES.FLOATING;
  if (approaching) state = STATES.APPROACHING_TARGET;
  else if (lastPassed && lastPassed.role !== ROLES.START) state = STATES.FLOATING_BETWEEN_TARGETS;
  return { state, floatingId: owner.id, dockedId: null };
}
