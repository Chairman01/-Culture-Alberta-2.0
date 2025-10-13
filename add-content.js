const fs = require('fs');

// Read the fallback file
const articles = JSON.parse(fs.readFileSync('optimized-fallback.json', 'utf8'));
console.log('Found', articles.length, 'articles');

// Find the first article and add sample content
if (articles.length > 0) {
  articles[0].content = `Alberta once led the country with the highest minimum wage in Canada. But after reaching $15/hour in 2018, the province hit pause — and never pressed play again. Now, as other provinces push past that mark, Alberta is poised to have the lowest minimum wage in the country.

The story isn't just about numbers — it's about what happens when policy stands still while everything else moves forward.

## The Rise to the Top

In 2015, Alberta's NDP government made a bold promise: to raise the minimum wage to $15 per hour by 2018. At the time, this was the highest minimum wage in Canada, and it represented a significant commitment to workers' rights and economic equality.

The increases came in phases:
- October 2015: $11.20 per hour
- October 2016: $12.20 per hour
- October 2017: $13.60 per hour
- October 2018: $15.00 per hour

For three years, Alberta workers enjoyed the highest minimum wage in the country.

## The Great Pause

But then something unexpected happened: nothing. While other provinces continued to increase their minimum wages to keep pace with inflation and cost of living, Alberta's minimum wage remained frozen at $15.00 per hour.

This wasn't by accident. The United Conservative Party (UCP), which came to power in 2019, made it clear that they had no intention of increasing the minimum wage further. In fact, they even rolled back some of the previous government's labour protections.

## The Fall from Grace

Fast forward to 2024, and Alberta's position has dramatically changed. Other provinces have caught up and surpassed Alberta:

- British Columbia: $16.75 per hour (as of June 2024)
- Ontario: $16.55 per hour
- Quebec: $15.25 per hour
- Prince Edward Island: $15.40 per hour

Alberta is now poised to have the lowest minimum wage in Canada, a stark contrast to its position just six years ago.

## The Real Impact

This isn't just about bragging rights or political points. The impact on workers is real and measurable:

- A full-time worker earning minimum wage in Alberta makes $31,200 per year
- The same worker in British Columbia makes $34,800 per year
- That's a difference of $3,600 annually, or about $300 per month

For families living paycheck to paycheck, this difference can mean the difference between making rent and facing eviction, between putting food on the table and going hungry.

## The Economic Argument

Proponents of keeping the minimum wage low argue that it helps businesses remain competitive and creates more jobs. But the evidence suggests otherwise:

- Studies consistently show that moderate minimum wage increases don't lead to significant job losses
- Higher wages can actually boost the economy by increasing consumer spending
- Businesses benefit from reduced turnover and higher productivity when workers are paid fairly

## Looking Forward

As Alberta prepares to potentially become the province with the lowest minimum wage in Canada, the question remains: is this the path we want to take?

The minimum wage isn't just a number—it's a statement about what we value as a society. It's about whether we believe that people who work full-time should be able to afford basic necessities like food, shelter, and clothing.

Alberta's fall from the top of the minimum wage rankings is more than just a statistical change—it's a reflection of changing priorities and values. The question is: do these changes align with what Albertans actually want?

Only time will tell if Alberta will once again lead the country in workers' rights, or if it will continue its slide to the bottom.`;
  
  fs.writeFileSync('optimized-fallback.json', JSON.stringify(articles, null, 2));
  console.log('Added sample content to first article:', articles[0].title);
} else {
  console.log('No articles found to update');
}
