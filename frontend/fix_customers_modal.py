import os

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the placement
bad_placement = """ , document.body)}
   </div>
  
   {/* Customer Detail Modal */}"""
   
good_placement = """ , document.body)}

   {/* Customer Detail Modal */}"""

content = content.replace(bad_placement, good_placement)

bad_end = """     document.body
   )}

 );
};"""

good_end = """     document.body
   )}
   </div>
 );
};"""

content = content.replace(bad_end, good_end)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
