// Script to populate initial articles
const articles = [
  {
    id: "indigenous-art-renaissance-alberta",
    title: "The Indigenous Art Renaissance in Alberta",
    excerpt: "How indigenous artists are reclaiming their cultural heritage through contemporary art forms. This resurgence represents not only a celebration of traditional practices but also a powerful statement about Indigenous identity, resilience, and presence in modern Alberta.",
    description: "Alberta's cultural landscape is witnessing a remarkable renaissance in Indigenous art, as artists across the province reclaim and reimagine their cultural heritage through contemporary forms of expression.",
    content: `
      Alberta's cultural landscape is witnessing a remarkable renaissance in Indigenous art, as artists across the province reclaim and reimagine their cultural heritage through contemporary forms of expression.

      Roots of Revival
      For generations, Indigenous artistic traditions in Alberta were suppressed through colonial policies and residential schools that actively discouraged cultural practices. Despite these challenges, knowledge keepers preserved techniques, stories, and symbolic languages that form the foundation of today's renaissance.

      "Our art was never lost, just waiting to flourish again," explains Sarah Cardinal, a Cree artist from Saddle Lake. "What we're seeing now is the result of seeds planted by our ancestors who kept our visual languages alive even when it was difficult or dangerous to do so."

      Contemporary Expressions
      Today's Indigenous artists are working across multiple mediums—from traditional beadwork and quillwork to digital art, large-scale installations, and performance. Many are blending ancestral techniques with contemporary approaches, creating works that speak to both historical and present-day experiences.

      In Edmonton, the Indigenous Art Park ᐄᓃᐤ (ÎNÎW) River Lot 11∞ features permanent installations by Indigenous artists that reflect the area's rich heritage as a gathering place. In Calgary, the Glenbow Museum has expanded its Indigenous collections and programming, while smaller galleries across the province increasingly showcase Indigenous artists.

      Art as Reconciliation
      The renaissance comes at a critical time in Alberta's journey toward reconciliation. Many artists view their work as a form of healing—not only for Indigenous communities but for all Albertans seeking to understand the province's complex history.

      "Art creates a space where difficult conversations can happen," notes Jason Eaglespeaker, a Blackfoot artist whose work addresses intergenerational trauma and recovery. "When people engage with Indigenous art, they're engaging with our stories, our perspectives, and our truths."

      Economic and Cultural Impact
      The renaissance is also creating economic opportunities. Indigenous art markets, such as Edmonton's Indigenous Art Market and Calgary's Treaty 7 Art Market, draw thousands of visitors annually. Online platforms have expanded the reach of artists to global audiences, while mentorship programs are nurturing the next generation of Indigenous creators.

      Cultural tourism centered around Indigenous art is growing, with visitors increasingly seeking authentic experiences that connect them to Alberta's First Peoples. This has led to innovative partnerships between artists, communities, and the tourism sector.

      Looking Forward
      As the renaissance continues to unfold, many artists are looking toward a future where Indigenous art is recognized not as a subset of Alberta's cultural identity but as fundamental to it.

      "We're not just reclaiming space in galleries or museums," says Métis artist Rebecca Cardinal. "We're reclaiming our place in the story of this land. Our art has always been here, and it will continue to evolve and thrive for generations to come."

      For those interested in experiencing this renaissance firsthand, Alberta offers numerous opportunities—from major institutions like the Art Gallery of Alberta to community-based initiatives, seasonal powwows, and Indigenous-led arts festivals that showcase the vibrant diversity of Indigenous creative expression.
    `,
    category: "Arts",
    location: "Alberta",
    date: "2024-04-15",
    type: "article",
    readTime: "5 min",
    author: "Cultural Affairs Team",
    status: "published",
    featured: false,
    tags: ["Indigenous Art", "Culture", "Alberta", "Arts", "Reconciliation"],
    image: "/images/placeholder-7.jpg"
  },
  {
    id: "edmonton-food-scene-2024",
    title: "Edmonton's Evolving Food Scene: A 2024 Guide",
    excerpt: "Discover the latest trends and hottest spots in Edmonton's dynamic culinary landscape, from innovative fusion restaurants to traditional comfort food destinations.",
    description: "A comprehensive look at how Edmonton's food scene has transformed in 2024, featuring interviews with local chefs and restaurateurs.",
    content: `Edmonton's food scene continues to evolve and surprise, with new restaurants and culinary innovations emerging across the city. This guide takes you through the latest developments and must-visit spots in 2024.`,
    category: "Food & Drink",
    location: "Edmonton",
    date: "2024-04-20",
    type: "article",
    readTime: "4 min",
    author: "Food & Culture Team",
    status: "published",
    featured: true,
    tags: ["Food", "Edmonton", "Restaurants", "Dining"],
    image: "/images/placeholder-1.jpg"
  },
  {
    id: "calgary-music-festival-2024",
    title: "Calgary's Summer Music Festival Season Kicks Off",
    excerpt: "Get ready for an incredible summer of music as Calgary's festival season begins with an impressive lineup of local and international artists.",
    description: "A preview of Calgary's upcoming summer music festivals, featuring exclusive interviews with organizers and performing artists.",
    content: `Calgary's music scene is about to come alive with a series of exciting festivals planned throughout the summer months.`,
    category: "Events",
    location: "Calgary",
    date: "2024-04-18",
    type: "article",
    readTime: "3 min",
    author: "Events Team",
    status: "published",
    featured: false,
    tags: ["Music", "Festivals", "Calgary", "Events"],
    image: "/images/placeholder-2.jpg"
  },
  {
    id: "banff-spring-activities-2024",
    title: "Spring Adventures in Banff: Your 2024 Guide",
    excerpt: "As the snow melts and spring arrives, Banff National Park offers a unique blend of activities for nature enthusiasts and adventure seekers.",
    description: "Discover the best spring activities in Banff National Park, from hiking and wildlife viewing to cultural experiences.",
    content: `Spring in Banff brings a special energy as the landscape transforms and new opportunities for adventure emerge.`,
    category: "Travel",
    location: "Banff",
    date: "2024-04-19",
    type: "article",
    readTime: "4 min",
    author: "Travel Team",
    status: "published",
    featured: false,
    tags: ["Travel", "Banff", "Adventure", "Spring"],
    image: "/images/placeholder-3.jpg"
  }
];

// Function to save articles to localStorage
function populateArticles() {
  try {
    console.log('Starting to populate articles...');
    
    // Clear existing articles
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('article-') || key.startsWith('article_') || 
          key.startsWith('event-') || key.startsWith('event_') || 
          key.startsWith('post-') || key.startsWith('post_') || 
          key.startsWith('best-of-') || key.startsWith('best_of_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared existing articles');

    // Add new articles
    articles.forEach(article => {
      const key = `article-${article.id}`;
      localStorage.setItem(key, JSON.stringify(article));
      console.log(`Added article: ${key} - ${article.title} (Featured: ${article.featured})`);
    });

    // Verify articles were saved
    const savedArticles = Object.keys(localStorage)
      .filter(key => key.startsWith('article-'))
      .map(key => {
        const article = JSON.parse(localStorage.getItem(key));
        return `${key}: ${article.title} (Featured: ${article.featured})`;
      });
    
    console.log('Saved articles:', savedArticles);
    console.log(`Successfully populated ${articles.length} articles to localStorage`);
  } catch (error) {
    console.log(`Error populating articles: ${error.message}`);
  }
}

// Run the population script
populateArticles(); 