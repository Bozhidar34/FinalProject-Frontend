<template src="./App.html"></template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

// --- ГЛОБАЛНИ КОНСТАНТИ ЗА API ---
const API_URL = 'http://localhost:8080/api/products';
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa('admin:Parola1')
});

// --- СЪСТОЯНИЯ (STATE) ---
const sortBy = ref('default');
const currentSlide = ref(0);
const promoSlides = ref([
  { image: 'https://r2.ensana-media.twodo.cz/2ce1469e-dd6b-4f53-8693-06e4a6dd17dc/7b692c37-8277-4f29-9e91-c946296c48e1/7-3-2023_9fbf9a1e-dd1f-4fed-bbff-d370099d097a/file.jpg', title: 'ДВИЖЕНИЕТО Е ЗДРАВЕ', subtitle: 'НАЙ-ДОБРИТЕ БЯГАЩИ ПЪТЕКИ ЗА ВАШАТА ФОРМА' },
  { image: 'https://cdn.shopify.com/s/files/1/1525/5556/files/The-GAT-Ultimate-Guide-to-Whey-Protein.jpg?v=1672961638', title: 'ПРОТЕИНЪТ ПОМАГА НА МУСКУЛА', subtitle: 'ОТКРИЙТЕ НАШИТЕ ПРЕМИУМ ХРАНИТЕЛНИ ДОБАВКИ' },
  { image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1470&auto=format&fit=crop', title: 'ПРОМОКОД: FIT2', subtitle: '' },
  { image: 'https://cdn.prod.website-files.com/5d9cc04ce8ca284415da1056/623de82e8a16eb1a4b41571c_Where%20can%20a%20beginner%20find%20a%20well-equipped%20gym%20for%20regular%20workout%20in%20Vacaville.jpg', title: 'ДОБРОТО ОБЛЕКЛО ПОМАГА НА ДОБРОТО ДВИЖЕНИЕ', subtitle: 'СТИЛ И КОМФОРТ ЗА ПО-ДОБРИ РЕЗУЛТАТИ' },
  { image: 'https://www.leadmanfitness.com/uploads/allimg/20240812/1-240Q216401WG.png', title: 'ФИТНЕС ОБОРУДВАНЕ НА ТОП КАЧЕСТВО', subtitle: 'ИНВЕСТИРАЙТЕ В НАЙ-ДОБРОТО ЗА ВАШАТА ФИТНЕС ЗАЛА' }
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
const registeredUsers = ref(JSON.parse(localStorage.getItem('users') || '[]'));

// Автоматично запазване в LocalStorage при всяка промяна!
watch(cart, (newVal) => localStorage.setItem('cart', JSON.stringify(newVal)), { deep: true });
watch(wishlist, (newVal) => localStorage.setItem('wishlist', JSON.stringify(newVal)), { deep: true });
watch(registeredUsers, (newVal) => localStorage.setItem('users', JSON.stringify(newVal)), { deep: true });

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

const newProduct = ref({ name: '', price: 0, imageUrl: '', category: 'Хранителни добавки', description: '' });

// --- РЕДАКЦИЯ НА ПРОДУКТ ---
const showEditModal = ref(false);
const editingProduct = ref({});

const editProduct = (product) => {
  editingProduct.value = { ...product }; 
  showEditModal.value = true;
};

const saveProductEdit = async () => {
  try {
    const productId = editingProduct.value.id || editingProduct.value.productId; 
    if (!productId) return console.error("Грешка: Продуктът няма ID!");

    const response = await fetch(`${API_URL}/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(editingProduct.value)
    });
    
    if (response.ok) {
      showEditModal.value = false;
      fetchProducts();
    } else {
      console.error("Грешка при запазване:", response.status);
    }
  } catch (error) {
    console.error("Грешка при връзката с бекенда:", error);
  }
};

// --- ЗВЕЗДЕН РЕЙТИНГ ---
const handleStarMousemove = (e, product) => {
  const bounds = e.currentTarget.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
  product.hoverRating = Math.ceil(percent * 10) / 2; // Опростена математика
};

const handleStarMouseleave = (product) => product.hoverRating = 0;

const setRating = async (product) => {
  if (isAdminLoggedIn.value) return; 
  product.rating = product.hoverRating;
  
  try {
    const response = await fetch(`${API_URL}/${product.id}/rating`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rating: product.rating })
    });
    if (!response.ok) console.error("Неуспешно запазване на рейтинга.");
  } catch (error) {
    console.error("Грешка:", error);
  }
};

// --- ФИЛТРИРАНЕ И СОРТИРАНЕ ---
const filteredAndSortedProducts = computed(() => {
  let result = selectedFilter.value === 'Всички' 
    ? [...products.value] 
    : products.value.filter(p => p.category === selectedFilter.value);
  
  const sortMap = {
    'price-asc': (a, b) => b.price - a.price,
    'price-desc': (a, b) => a.price - b.price,
    'rating-desc': (a, b) => (b.rating || 0) - (a.rating || 0),
    'rating-asc': (a, b) => (a.rating || 0) - (b.rating || 0)
  };

  if (sortMap[sortBy.value]) {
    result.sort(sortMap[sortBy.value]);
  }
  return result;
});

// --- КОШНИЦА И ЛЮБИМИ ---
const toggleWishlist = (product) => {
  const index = wishlist.value.findIndex(p => p.id === product.id);
  index === -1 ? wishlist.value.push(product) : wishlist.value.splice(index, 1);
};

const isInWishlist = (product) => wishlist.value.some(p => p.id === product.id);

const addToCart = (product) => { 
  cart.value.push(product); 
  showCart.value = true; 
};

const removeFromCart = (index) => cart.value.splice(index, 1);

const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + item.price, 0).toFixed(2));

const startCheckout = () => { 
  showCart.value = false; 
  currentView.value = 'checkout'; 
};

// --- CHECKOUT ---
const orderDetails = ref({ name: '', phone: '', shippingMethod: 'econt-office', address: '' });
const orderSuccess = ref(false);

const submitOrder = () => {
  if (!orderDetails.value.name || !orderDetails.value.phone || !orderDetails.value.address) {
    return alert("Моля, попълнете всички полета (Име, Телефон и Адрес)!");
  }
  orderSuccess.value = true;
  cart.value = []; // watch функцията автоматично ще изчисти и LocalStorage!
};

const finishCheckout = () => {
  orderSuccess.value = false;
  orderDetails.value = { name: '', phone: '', shippingMethod: 'econt-office', address: '' };
  resetView(); 
};

// --- НАВИГАЦИЯ ---
const selectCategory = (cat) => { selectedFilter.value = cat; currentView.value = 'category'; };
const resetView = () => { selectedFilter.value = 'Всички'; currentView.value = 'home'; };

// --- ЛОГИН ЛОГИКА ---
const handleAuthSuccess = (role, username) => {
  isAdminLoggedIn.value = role === 'admin';
  isUserLoggedIn.value = role === 'user';
  localStorage.setItem('authRole', role);
  if (username) localStorage.setItem('username', username);
  showAdminModal.value = false;
  showUserModal.value = false;
  resetView();
};

const loginAdmin = () => {
  if (adminCredentials.value.username === 'admin' && adminCredentials.value.password === 'Parola1') {
    adminLoginError.value = false;
    handleAuthSuccess('admin');
  } else { 
    adminLoginError.value = true; 
  }
};

const loginUser = () => {
  const foundUser = registeredUsers.value.find(u => u.username === userCredentials.value.username && u.password === userCredentials.value.password);
  if (foundUser) {
    userLoginError.value = false;
    handleAuthSuccess('user', foundUser.username);
  } else { 
    userLoginError.value = true; 
  }
};

const registerUser = () => {
  if (registerCredentials.value.username && registerCredentials.value.password) {
    registeredUsers.value.push({ ...registerCredentials.value });
    handleAuthSuccess('user', registerCredentials.value.username);
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

// --- API ЗАЯВКИ ---
const fetchProducts = async () => {
  try {
    const response = await fetch(API_URL, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(`Грешка от сървъра: ${response.status}`);
    
    const data = await response.json();
    products.value = data.map(p => ({ ...p, rating: p.rating || 0, hoverRating: 0 }));
  } catch (error) { 
    console.error("Грешка при зареждане. Работи ли бекендът?", error); 
  }
};

const addProduct = async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      await fetch(`${API_URL}/${id}`, { 
        method: 'DELETE', 
        headers: getAuthHeaders() 
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
  if (role === 'admin') isAdminLoggedIn.value = true;
  else if (role === 'user') isUserLoggedIn.value = true;
});

onUnmounted(() => { 
  if (sliderInterval) clearInterval(sliderInterval); 
});
</script>

<style src="./style.css"></style>