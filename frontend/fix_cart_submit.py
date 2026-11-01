import os
import re

filepath = 'src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_submit = """ async function submit() { 
  setLoading(true); setError('');"""

new_submit = """ async function submit() { 
  if (orderType === 'DELIVERY') {
    if (!deliveryAddress.trim()) { setError('Please enter a delivery address.'); return; }
    if (!deliveryPincode.trim()) { setError('Please enter your pincode.'); return; }
  }
  setLoading(true); setError('');"""

content = content.replace(old_submit, new_submit)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
