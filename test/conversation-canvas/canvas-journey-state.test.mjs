// Canvas journey state model: node --test (npm test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES, STATES, assignRoles, resolveJourney,
} from '../../blocks/conversation-canvas/canvas-journey-state.js';

// a page: start Canvas (hero), two section Canvases, footer Canvas
const page = (overrides = {}) => assignRoles([
  { id: 'hero' },
  { id: 'section-1' },
  { id: 'section-2' },
  { id: 'footer', inFooter: true },
]).map((instance) => ({
  visible: false, near: false, passed: false, ...instance, ...overrides[instance.id],
}));

describe('target discovery', () => {
  it('assigns roles in DOM order', () => {
    assert.deepEqual(page().map(({ role }) => role), [
      ROLES.START, ROLES.INTERMEDIATE, ROLES.INTERMEDIATE, ROLES.FINAL,
    ]);
  });

  it('keeps a single final stop and marks the Primary style as the dock', () => {
    const roles = assignRoles([
      { id: 'dock', primary: true },
      { id: 'a' },
      { id: 'footer-1', inFooter: true },
      { id: 'footer-2', inFooter: true },
    ]).map(({ role }) => role);
    assert.deepEqual(roles, [ROLES.DOCK, ROLES.START, ROLES.FINAL, ROLES.INTERMEDIATE]);
  });

  it('has no start when the only Canvas is in the footer', () => {
    assert.deepEqual(assignRoles([{ id: 'f', inFooter: true }]).map(({ role }) => role), [ROLES.FINAL]);
  });
});

describe('downward journey', () => {
  it('starts docked in the header / hero', () => {
    const r = resolveJourney(page({ hero: { visible: true } }));
    assert.deepEqual(r, { state: STATES.DOCKED_HEADER, floatingId: null, dockedId: 'hero' });
  });

  it('does not float before the start Canvas is reached', () => {
    assert.equal(resolveJourney(page()).state, STATES.INITIAL);
  });

  it('floats the start Canvas once scrolled past', () => {
    const r = resolveJourney(page({ hero: { passed: true } }));
    assert.deepEqual(r, { state: STATES.FLOATING, floatingId: 'hero', dockedId: null });
  });

  it('approaches, then docks in a section Canvas without floating', () => {
    const near = resolveJourney(page({ hero: { passed: true }, 'section-1': { near: true } }));
    assert.equal(near.state, STATES.APPROACHING_TARGET);
    assert.equal(near.floatingId, 'hero');
    const docked = resolveJourney(page({ hero: { passed: true }, 'section-1': { visible: true } }));
    assert.deepEqual(docked, { state: STATES.DOCKED_SECTION, floatingId: null, dockedId: 'section-1' });
  });

  it('hands the floating presentation over to the section Canvas after it', () => {
    const r = resolveJourney(page({ hero: { passed: true }, 'section-1': { passed: true } }));
    assert.deepEqual(r, {
      state: STATES.FLOATING_BETWEEN_TARGETS, floatingId: 'section-1', dockedId: null,
    });
  });

  it('yields before the footer and stops in the footer Canvas', () => {
    const passedAll = { hero: { passed: true }, 'section-1': { passed: true }, 'section-2': { passed: true } };
    const approaching = resolveJourney(page(passedAll), { footerVisible: true });
    assert.deepEqual(approaching, {
      state: STATES.APPROACHING_FOOTER, floatingId: null, dockedId: null,
    });
    const atFooter = page({ ...passedAll, footer: { visible: true } });
    const final = resolveJourney(atFooter, { footerVisible: true });
    assert.deepEqual(final, { state: STATES.DOCKED_FOOTER, floatingId: null, dockedId: 'footer' });
  });

  it('never floats the footer Canvas, even when scrolled past it', () => {
    const r = resolveJourney(page({ hero: { passed: true }, footer: { passed: true } }));
    assert.equal(r.floatingId, 'hero');
  });
});

describe('upward journey', () => {
  it('floats the last Canvas above the viewport again', () => {
    const r = resolveJourney(page({ hero: { passed: true } }), { direction: 'up' });
    assert.equal(r.floatingId, 'hero');
  });

  it('with several Canvases in view picks the last one scrolling up, the first scrolling down', () => {
    const both = page({ 'section-1': { visible: true }, 'section-2': { visible: true } });
    assert.equal(resolveJourney(both, { direction: 'down' }).dockedId, 'section-1');
    assert.equal(resolveJourney(both, { direction: 'up' }).dockedId, 'section-2');
  });

  it('keeps the docked Canvas while it stays in view (no flicker)', () => {
    const both = page({ 'section-1': { visible: true }, 'section-2': { visible: true } });
    const r = resolveJourney(both, { direction: 'down' }, { dockedId: 'section-2' });
    assert.equal(r.dockedId, 'section-2');
  });
});

describe('ownership and fallbacks', () => {
  it('floats only one instance at a time', () => {
    const r = resolveJourney(page({
      hero: { passed: true }, 'section-1': { passed: true }, 'section-2': { passed: true },
    }));
    assert.equal(r.floatingId, 'section-2');
  });

  it('the Primary dock owns the floating presentation', () => {
    const instances = assignRoles([{ id: 'dock', primary: true }, { id: 'hero' }])
      .map((i) => ({ ...i, passed: i.id === 'hero' }));
    assert.equal(resolveJourney(instances).floatingId, 'dock');
  });

  it('a Stay in place Canvas never floats but still docks', () => {
    const r = resolveJourney(page({ hero: { passed: true }, 'section-1': { passed: true, stayInPlace: true } }));
    assert.equal(r.floatingId, 'hero');
    const docked = resolveJourney(page({ 'section-1': { visible: true, stayInPlace: true } }));
    assert.equal(docked.dockedId, 'section-1');
  });

  it('falls back to stopping at the footer when there is no footer Canvas', () => {
    const instances = assignRoles([{ id: 'hero' }]).map((i) => ({ ...i, passed: true }));
    const r = resolveJourney(instances, { footerVisible: true });
    assert.deepEqual(r, { state: STATES.FALLBACK, floatingId: null, dockedId: null });
  });

  it('works with a Canvas only in the footer', () => {
    const instances = assignRoles([{ id: 'footer', inFooter: true }]);
    assert.equal(resolveJourney(instances).state, STATES.INITIAL);
    assert.equal(resolveJourney([{ ...instances[0], visible: true }]).state, STATES.DOCKED_FOOTER);
  });

  it('steps aside while the mobile menu is open', () => {
    const r = resolveJourney(page({ hero: { passed: true } }), { navOpen: true });
    assert.equal(r.state, STATES.DISABLED);
    assert.equal(r.floatingId, null);
  });

  it('keeps the floating Canvas while it has keyboard focus', () => {
    const previous = { state: STATES.FLOATING, floatingId: 'hero', dockedId: null };
    const r = resolveJourney(page({ hero: { passed: true }, 'section-1': { visible: true } }), { focusedId: 'hero' }, previous);
    assert.equal(r.floatingId, 'hero');
  });

  it('is disabled without Canvas instances', () => {
    assert.equal(resolveJourney([]).state, STATES.DISABLED);
  });
});
