// cypress/e2e/critical_flows.cy.js

describe('Critical UI flows', () => {
  // Referral code auto‑fill
  it('prefills referral code on signup', () => {
    cy.visit('/signup?ref=TEST123');
    cy.get('input[name="referral_code"]').should('have.value', 'TEST123');
  });

  // Login page header
  it('shows login header', () => {
    cy.visit('/login');
    cy.contains('Customer sign in').should('be.visible');
  });

  // Invoice layout on mobile viewport
  it('renders invoice without overflow on mobile', () => {
    // Assume an order with id 1 exists; otherwise this will 404.
    cy.viewport(375, 667); // iPhone 6/7/8 size
    cy.visit('/owner/orders/1/invoice');
    // Check that the main invoice container is visible and not overflowing.
    cy.get('[data-testid="invoice-container"]').should('be.visible');
    // Ensure no horizontal scroll on the body.
    cy.window().then(win => {
      expect(win.document.body.scrollWidth).to.equal(win.innerWidth);
    });
  });
});
