import os

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "await api.post(/auth/customers//approve-delete/);",
    "await api.post(`/auth/customers/${userId}/approve-delete/`);"
)

content = content.replace(
    "await api.post(/auth/customers//reject-delete/);",
    "await api.post(`/auth/customers/${userId}/reject-delete/`);"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
