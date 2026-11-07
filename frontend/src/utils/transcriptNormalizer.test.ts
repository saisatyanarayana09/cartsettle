import { describe, it, expect } from 'vitest';
import { normalizeVoiceTranscript } from './transcriptNormalizer';

describe('normalizeVoiceTranscript', () => {
  it('correctly maps phonetic cart misspellings to cart', () => {
    expect(normalizeVoiceTranscript('cart')).toBe('cart');
    expect(normalizeVoiceTranscript('card')).toBe('cart');
    expect(normalizeVoiceTranscript('my card')).toBe('my cart');
    expect(normalizeVoiceTranscript('in card')).toBe('in cart');
    expect(normalizeVoiceTranscript('add 2 milk to my card')).toBe('add 2 milk to my cart');
    expect(normalizeVoiceTranscript('view card')).toBe('view cart');
    expect(normalizeVoiceTranscript('open card')).toBe('open cart');
    expect(normalizeVoiceTranscript('card total')).toBe('cart total');
    expect(normalizeVoiceTranscript('what is in my card')).toBe('what is in my cart');
    expect(normalizeVoiceTranscript('clear card')).toBe('clear cart');
    expect(normalizeVoiceTranscript('empty card')).toBe('empty cart');
    expect(normalizeVoiceTranscript('add all the items into the part that are in stock')).toBe('add all the items into cart that are in stock');
    expect(normalizeVoiceTranscript('my car')).toBe('my cart');
    expect(normalizeVoiceTranscript('view car')).toBe('view cart');
    expect(normalizeVoiceTranscript('car total')).toBe('cart total');
    expect(normalizeVoiceTranscript('add milk to car')).toBe('add milk to cart');
    expect(normalizeVoiceTranscript('add to court')).toBe('add to cart');
    expect(normalizeVoiceTranscript('court total')).toBe('cart total');
  });

  it('preserves payment cards and does not convert them to cart', () => {
    expect(normalizeVoiceTranscript('pay with credit card')).toBe('pay with credit card');
    expect(normalizeVoiceTranscript('my debit card')).toBe('my debit card');
    expect(normalizeVoiceTranscript('apply gift card')).toBe('apply gift card');
    expect(normalizeVoiceTranscript('enter card pin')).toBe('enter card pin');
    expect(normalizeVoiceTranscript('card number')).toBe('card number');
  });

  it('normalizes vernacular Kirana and phonetic food terms', () => {
    expect(normalizeVoiceTranscript('bhaiya total kitna hua')).toBe('bhaiya cart total');
    expect(normalizeVoiceTranscript('2 doodh add karo')).toBe('2 milk add karo');
    expect(normalizeVoiceTranscript('anda aur bread')).toBe('eggs aur bread');
    expect(normalizeVoiceTranscript('cheepar alternative')).toBe('cheaper alternative');
    expect(normalizeVoiceTranscript('kansal order')).toBe('cancel order');
    expect(normalizeVoiceTranscript('cheqout now')).toBe('checkout now');
  });

  it('converts spoken numbers and currencies', () => {
    expect(normalizeVoiceTranscript('add twenty five milk')).toBe('add 25 milk');
    expect(normalizeVoiceTranscript('twenty percent off')).toBe('20% off');
    expect(normalizeVoiceTranscript('under five dollars')).toBe('under $5');
  });
});
