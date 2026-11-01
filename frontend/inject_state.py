import os

filepath = 'src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_hooks = "const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);"

new_hooks = """const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);
 const [orderType, setOrderType] = useState('PICKUP');
 const [deliveryAddress, setDeliveryAddress] = useState('');
 const [deliveryPincode, setDeliveryPincode] = useState('');"""

content = content.replace(old_hooks, new_hooks)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
