<template src="./App.html"></template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const sortBy = ref('default');
const currentSlide = ref(0);
const promoSlides = ref([
  { 
    image: 'https://r2.ensana-media.twodo.cz/2ce1469e-dd6b-4f53-8693-06e4a6dd17dc/7b692c37-8277-4f29-9e91-c946296c48e1/7-3-2023_9fbf9a1e-dd1f-4fed-bbff-d370099d097a/file.jpg', 
    title: 'ДВИЖЕНИЕТО Е ЗДРАВЕ', 
    subtitle: 'НАЙ-ДОБРИТЕ БЯГАЩИ ПЪТЕКИ ЗА ВАШАТА ФОРМА' 
  },
  { 
    image: 'https://cdn.shopify.com/s/files/1/1525/5556/files/The-GAT-Ultimate-Guide-to-Whey-Protein.jpg?v=1672961638', 
    title: 'ПРОТЕИНЪТ ПОМАГА НА МУСКУЛА', 
    subtitle: 'ОТКРИЙТЕ НАШИТЕ ПРЕМИУМ ХРАНИТЕЛНИ ДОБАВКИ' 
  },
  { 
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1470&auto=format&fit=crop', 
    title: 'ПРОМОКОД: FIT2', 
    subtitle: '' 
  },
  { 
    image: 'https://cdn.prod.website-files.com/5d9cc04ce8ca284415da1056/623de82e8a16eb1a4b41571c_Where%20can%20a%20beginner%20find%20a%20well-equipped%20gym%20for%20regular%20workout%20in%20Vacaville.jpg', 
    title: 'ДОБРОТО ОБЛЕКЛО ПОМАГА НА ДОБРОТО ДВИЖЕНИЕ', 
    subtitle: 'СТИЛ И КОМФОРТ ЗА ПО-ДОБРИ РЕЗУЛТАТИ' 
  },
  { 
    image: 'https://www.leadmanfitness.com/uploads/allimg/20240812/1-240Q216401WG.png', 
    title: 'ФИТНЕС ОБОРУДВАНЕ НА ТОП КАЧЕСТВО', 
    subtitle: 'ИНВЕСТИРАЙТЕ В НАЙ-ДОБРОТО ЗА ВАШАТА ФИТНЕС ЗАЛА' 
  }
]);

let sliderInterval = null;
const startSlider = () => {
  sliderInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % promoSlides.value.length;
  }, 5000);
};

const products = ref([]);
const cart = ref(JSON.parse(localStorage.getItem('cart') || '[]'));
const wishlist = ref(JSON.parse(localStorage.getItem('wishlist') || '[]'));
const showCart = ref(false);
const currentView = ref('home');
const selectedFilter = ref('Всички');

const isAdminLoggedIn = ref(false);
const isUserLoggedIn = ref(false);
const showAdminModal = ref(false);
const showUserModal = ref(false);
const loginMode = ref('login');
const adminLoginError = ref(false);
const userLoginError = ref(false);

const adminCredentials = ref({ username: '', password: '' });
const userCredentials = ref({ username: '', password: '' });
const registerCredentials = ref({ username: '', email: '', password: '' });
const registeredUsers = ref(JSON.parse(localStorage.getItem('users') || '[]'));

const newProduct = ref({ name: '', price: 0, imageUrl: '', category: 'Хранителни добавки', description: '' });

// --- РЕДАКЦИЯ НА ПРОДУКТ ---
const showEditModal = ref(false);
const editingProduct = ref({});

const editProduct = (product) => {
  console.log("Данни на продукта:", product);
  editingProduct.value = { ...product }; 
  showEditModal.value = true;
};

const saveProductEdit = async () => {
  try {
    // Проверка дали изобщо имаме ID (ако полето ти в бекенда е с друго име, смени го тук)
    const productId = editingProduct.value.id || editingProduct.value.productId; 
    
    if (!productId) {
      console.error("Грешка: Продуктът няма ID!", editingProduct.value);
      return;
    }

    const authHeader = 'Basic ' + btoa('admin:Parola1');
    const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': authHeader 
      },
      body: JSON.stringify(editingProduct.value)
    });
    
    if (response.ok) {
      showEditModal.value = false;
      fetchProducts(); // Презареждаме продуктите, за да видим промените
    } else {
      console.error("Сървърът върна грешка при запазване:", response.status);
    }
  } catch (error) {
    console.error("Грешка при връзката с бекенда:", error);
  }
};

// --- ЛОГИКА ЗА ЗВЕЗДНИЯ РЕЙТИНГ ---
const handleStarMousemove = (e, product) => {
  const bounds = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - bounds.left;
  const percent = Math.max(0, Math.min(1, x / bounds.width));
  product.hoverRating = Math.ceil(percent * 5 * 2) / 2;
};

const handleStarMouseleave = (product) => {
  product.hoverRating = 0;
};

const setRating = async (product) => {
  if (isAdminLoggedIn.value) return; 
  product.rating = product.hoverRating;
  
  try {
    const authHeader = 'Basic ' + btoa('admin:Parola1');
    const response = await fetch(`http://localhost:8080/api/products/${product.id}/rating`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ rating: product.rating })
    });

    if (!response.ok) {
      console.error("Неуспешно запазване на рейтинга в базата.");
    }
  } catch (error) {
    console.error("Грешка при връзката с бекенда:", error);
  }
};

// --- ФИЛТРИРАНЕ И СОРТИРАНЕ ---
const filteredAndSortedProducts = computed(() => {
  let result = [...products.value];
  if (selectedFilter.value !== 'Всички') {
    result = result.filter(p => p.category === selectedFilter.value);
  }
  
  if (sortBy.value === 'price-asc') {
    result.sort((a, b) => b.price - a.price); 
  } else if (sortBy.value === 'price-desc') {
    result.sort((a, b) => a.price - b.price); 
  } else if (sortBy.value === 'rating-desc') {
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy.value === 'rating-asc') {
    result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  }
  return result;
});

// --- КОШНИЦА И ЛЮБИМИ ---
const toggleWishlist = (product) => {
  const index = wishlist.value.findIndex(p => p.id === product.id);
  if (index === -1) {
    wishlist.value.push(product);
  } else {
    wishlist.value.splice(index, 1);
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist.value));
};

const isInWishlist = (product) => wishlist.value.some(p => p.id === product.id);

const addToCart = (product) => { 
  cart.value.push(product); 
  showCart.value = true; 
  localStorage.setItem('cart', JSON.stringify(cart.value));
};

const removeFromCart = (index) => { 
  cart.value.splice(index, 1); 
  localStorage.setItem('cart', JSON.stringify(cart.value));
};

const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + item.price, 0).toFixed(2));

const startCheckout = () => { 
  showCart.value = false; 
  currentView.value = 'checkout'; 
};

// --- ДАННИ ЗА ПОРЪЧКА (CHECKOUT) ---
const orderDetails = ref({ 
  name: '', 
  phone: '', 
  shippingMethod: 'econt-office', 
  address: '' 
});
const orderSuccess = ref(false);

const submitOrder = () => {
  if (!orderDetails.value.name || !orderDetails.value.phone || !orderDetails.value.address) {
    alert("Моля, попълнете всички полета (Име, Телефон и Адрес)!");
    return;
  }
  
  orderSuccess.value = true;
  cart.value = []; 
};

const finishCheckout = () => {
  orderSuccess.value = false;
  orderDetails.value = { name: '', phone: '', shippingMethod: 'econt-office', address: '' };
  resetView(); 
};

// --- НАВИГАЦИЯ ---
const selectCategory = (cat) => { 
  selectedFilter.value = cat; 
  currentView.value = 'category'; 
};

const resetView = () => { 
  selectedFilter.value = 'Всички'; 
  currentView.value = 'home'; 
};

// --- ЛОГИН ЛОГИКА ---
const loginAdmin = () => {
  if (adminCredentials.value.username === 'admin' && adminCredentials.value.password === 'Parola1') {
    isAdminLoggedIn.value = true; 
    isUserLoggedIn.value = false; 
    localStorage.setItem('authRole', 'admin'); 
    showAdminModal.value = false; 
    adminLoginError.value = false; 
    resetView();
  } else { 
    adminLoginError.value = true; 
  }
};

const loginUser = () => {
  const foundUser = registeredUsers.value.find(u => u.username === userCredentials.value.username && u.password === userCredentials.value.password);
  if (foundUser) {
    isUserLoggedIn.value = true; 
    isAdminLoggedIn.value = false; 
    localStorage.setItem('authRole', 'user'); 
    localStorage.setItem('username', foundUser.username); 
    showUserModal.value = false; 
    userLoginError.value = false; 
    resetView();
  } else { 
    userLoginError.value = true; 
  }
};

const registerUser = () => {
  if (registerCredentials.value.username && registerCredentials.value.password) {
    registeredUsers.value.push({ ...registerCredentials.value });
    localStorage.setItem('users', JSON.stringify(registeredUsers.value));
    isUserLoggedIn.value = true; 
    isAdminLoggedIn.value = false; 
    localStorage.setItem('authRole', 'user'); 
    localStorage.setItem('username', registerCredentials.value.username);
    showUserModal.value = false;
    registerCredentials.value = { username: '', email: '', password: '' };
  } else { 
    alert("Моля, попълнете данни!"); 
  }
};

const logout = () => { 
  isAdminLoggedIn.value = false; 
  isUserLoggedIn.value = false; 
  localStorage.removeItem('authRole'); 
  localStorage.removeItem('username');
};

// --- API ЗАЯВКИ (БЕКЕНД) ---
const fetchProducts = async () => {
  try {
    const authHeader = 'Basic ' + btoa('admin:Parola1');

    const response = await fetch('http://localhost:8080/api/products', {
      method: 'GET',
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Грешка от сървъра: ${response.status}`);
    }

    const data = await response.json();
    products.value = data.map(p => ({
      ...p,
      rating: p.rating || 0,
      hoverRating: 0
    }));
    console.log("Продуктите са заредени!");
  } catch (error) { 
    console.error("Грешка при зареждане на продуктите. Уверете се, че Бекендът работи!", error); 
  }
};

const addProduct = async () => {
  try {
    const authHeader = 'Basic ' + btoa('admin:Parola1');
    const response = await fetch('http://localhost:8080/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': authHeader 
      },
      body: JSON.stringify(newProduct.value)
    });
    if (response.ok) {
      newProduct.value = { name: '', price: 0, imageUrl: '', category: 'Хранителни добавки', description: '' };
      fetchProducts();
    }
  } catch (error) {
    console.error("Грешка при добавяне:", error);
  }
};

const deleteProduct = async (id) => {
  if (confirm("Сигурни ли сте, че искате да изтриете този продукт?")) {
    try {
      const authHeader = 'Basic ' + btoa('admin:Parola1');
      await fetch(`http://localhost:8080/api/products/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': authHeader } 
      });
      fetchProducts();
    } catch (error) {
      console.error("Грешка при изтриване:", error);
    }
  }
};

onMounted(() => { 
  fetchProducts(); 
  startSlider(); 

  const role = localStorage.getItem('authRole');
  if (role === 'admin') {
    isAdminLoggedIn.value = true;
  } else if (role === 'user') {
    isUserLoggedIn.value = true;
  }
});

onUnmounted(() => { 
  if (sliderInterval) clearInterval(sliderInterval); 
});
</script>

<style src="./style.css"></style>