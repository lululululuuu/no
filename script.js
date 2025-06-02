import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyCIWSLwyUCEkKGz4bne2leVHIbm7EFpObg",
    authDomain: "yuuu-52269.firebaseapp.com",
    databaseURL: "https://yuuu-52269-default-rtdb.firebaseio.com",
    projectId: "yuuu-52269",
    storageBucket: "yuuu-52269.appspot.com",
    messagingSenderId: "208020331487",
    appId: "1:208020331487:web:dc207529c8378a5c9d826a",
    measurementId: "G-PDS03JGPRR"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// 頁面元素獲取
const homePage = document.getElementById('homePage');
const animalDetailPage = document.getElementById('animalDetailPage');
const applyFormPage = document.getElementById('applyFormPage');
const uploadAnimalPage = document.getElementById('uploadAnimalPage');

const homeLink = document.getElementById('homeLink');
const navHome = document.getElementById('navHome');
const navUploadAnimal = document.getElementById('navUploadAnimal');
const navAbout = document.querySelector('a[href="#about"]');
const navContact = document.querySelector('a[href="#contact"]');
const backFromAboutBtn = document.getElementById('backFromAboutBtn');
const backFromContactBtn = document.getElementById('backFromContactBtn');

const animalListElement = document.getElementById('animalList');
const searchInput = document.getElementById('searchInput');
const speciesFilter = document.getElementById('speciesFilter');
const ageFilter = document.getElementById('ageFilter');
const genderFilter = document.getElementById('genderFilter');
const searchButton = document.getElementById('searchButton');

const animalDetailContent = document.getElementById('animalDetailContent');
const adoptionForm = document.getElementById('adoptionForm');
const animalIdInput = document.getElementById('animalId');
const animalNameInput = document.getElementById('animalName');
const applyFormTitle = document.getElementById('applyFormTitle');
const backToDetailBtn = document.getElementById('backToDetailBtn');

// 上傳動物表單元素 (移除圖片相關元素)
const uploadAnimalForm = document.getElementById('uploadAnimalForm');
const backFromUploadBtn = document.getElementById('backFromUploadBtn');

let currentAnimalId = null; // 用於儲存當前查看的動物ID
let currentAnimalName = null; // 用於儲存當前查看的動物名稱

// --- 頁面切換邏輯 ---
function showPage(pageId, data = null) {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'animalDetailPage' && data) {
        displayAnimalDetail(data);
    } else if (pageId === 'applyFormPage' && data) {
        setupApplyForm(data.id, data.name);
    } else if (pageId === 'homePage') {
        fetchAnimals(); // 回到首頁時重新載入動物列表
    } else if (pageId === 'uploadAnimalPage') {
        uploadAnimalForm.reset(); // 清空上傳表單
    }
}

// --- 首頁 (動物列表) 邏輯 ---
async function fetchAnimals(searchTerm = '', species = '', ageGroup = '', gender = '') {
    animalListElement.innerHTML = '<p>載入中，請稍候...</p>';
    let query = collection(db, 'animals');
    query = where(query, 'isAdopted', '==', false);

    if (species) {
        query = where(query, 'species', '==', species);
    }
    if (gender) {
        query = where(query, 'gender', '==', gender);
    }

    try {
        const snapshot = await getDocs(query);
        let animals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 前端篩選年齡組
        if (ageGroup) {
            animals = animals.filter(animal => {
                if (ageGroup === 'young') return animal.age >= 0 && animal.age <= 1;
                if (ageGroup === 'adult') return animal.age > 1 && animal.age <= 7;
                if (ageGroup === 'senior') return animal.age > 7;
                return true;
            });
        }

        // 前端篩選關鍵字
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            animals = animals.filter(animal =>
                animal.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (animal.description && animal.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (animal.breed && animal.breed.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (animal.personality && animal.personality.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        displayAnimals(animals);
    } catch (error) {
        console.error("Error fetching animals: ", error);
        animalListElement.innerHTML = '<p>無法載入動物資料，請稍後再試。</p>';
    }
}

function displayAnimals(animals) {
    animalListElement.innerHTML = '';
    if (animals.length === 0) {
        animalListElement.innerHTML = '<p>目前沒有符合條件的動物。</p>';
        return;
    }

    animals.forEach(animal => {
        const card = document.createElement('div');
        card.classList.add('animal-card');

        const imageUrl = './images/default-animal.jpg'; // 預設圖片路徑

        card.innerHTML = `
            <img src="${imageUrl}" alt="${animal.name}">
            <div class="animal-card-content">
                <h3>${animal.name}</h3>
                <p><strong>年齡:</strong> ${animal.age} 歲</p>
                <p><strong>種類:</strong> ${animal.species}</p>
                <button class="btn-detail" data-animal-id="${animal.id}">查看詳情</button>
            </div>
        `;
        animalListElement.appendChild(card);
    });

    document.querySelectorAll('.btn-detail').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.animalId;
            try {
                const docRef = doc(db, 'animals', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    currentAnimalId = docSnap.id;
                    currentAnimalName = docSnap.data().name;
                    showPage('animalDetailPage', { id: docSnap.id, ...docSnap.data() });
                } else {
                    alert('查無此動物資訊。');
                }
            } catch (error) {
                console.error("Error fetching animal detail: ", error);
                alert('載入動物詳細資訊失敗，請稍後再試。');
            }
        });
    });
}

const applyFilters = () => {
    const searchTerm = searchInput.value.trim();
    const selectedSpecies = speciesFilter.value;
    const selectedAgeGroup = ageFilter.value;
    const selectedGender = genderFilter.value;
    fetchAnimals(searchTerm, selectedSpecies, selectedAgeGroup, selectedGender);
};

searchButton.addEventListener('click', applyFilters);
speciesFilter.addEventListener('change', applyFilters);
ageFilter.addEventListener('change', applyFilters);
genderFilter.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

// --- 動物詳細頁面邏輯 ---
function displayAnimalDetail(animal) {
    let imageHtml = `<img src="./images/default-animal.jpg" alt="${animal.name}">`;

    const applyButtonHtml = animal.isAdopted
        ? `<button class="btn-apply adopted" disabled>已領養</button>`
        : `<button class="btn-apply" id="applyBtn" data-animal-id="${animal.id}" data-animal-name="${encodeURIComponent(animal.name)}">送出領養申請</button>`;

    animalDetailContent.innerHTML = `
        <h2>${animal.name}</h2>
        <div class="animal-detail-content">
            <div class="animal-detail-images">
                ${imageHtml}
            </div>
            <div class="animal-info">
                <p><strong>年齡:</strong> ${animal.age} 歲</p>
                <p><strong>種類:</strong> ${animal.species}</p>
                <p><strong>品種:</strong> ${animal.breed || '未提供'}</p>
                <p><strong>性別:</strong> ${animal.gender || '未提供'}</p>
                <p><strong>體型:</strong> ${animal.size || '未提供'}</p>
                <p><strong>健康狀況:</strong> ${animal.healthStatus || '良好'}</p>
                <p><strong>個性描述:</b> ${animal.personality || '溫馴可愛'}</p>
                <div class="description">
                    <h3>詳細介紹</h3>
                    <p>${animal.description || '暫無詳細介紹。'}</p>
                </div>
                ${applyButtonHtml}
            </div>
        </div>
    `;

    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn && !applyBtn.disabled) {
        applyBtn.addEventListener('click', (e) => {
            const id = e.target.dataset.animalId;
            const name = decodeURIComponent(e.target.dataset.animalName);
            showPage('applyFormPage', { id: id, name: name });
        });
    }
}

// --- 領養申請表單邏輯 ---
function setupApplyForm(animalId, animalName) {
    animalIdInput.value = animalId;
    animalNameInput.value = animalName;
    applyFormTitle.textContent = `領養申請表 - ${animalName}`;
}

adoptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const applicantName = document.getElementById('applicantName').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;
    const experience = document.getElementById('experience').value;
    const motivation = document.getElementById('motivation').value;
    const notes = document.getElementById('notes').value;

    if (!applicantName || !phone || !email || !address || !experience || !motivation) {
        alert('請填寫所有必填欄位。');
        return;
    }

    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phone)) {
        alert('請輸入有效的10位數字電話號碼。');
        return;
    }

    try {
        await addDoc(collection(db, 'applications'), {
            animalId: animalIdInput.value,
            animalName: animalNameInput.value,
            applicantName: applicantName,
            phone: phone,
            email: email,
            address: address,
            experience: experience,
            motivation: motivation,
            notes: notes,
            appliedAt: new Date()
        });
        alert('領養申請已送出，我們會盡快與您聯繫。');
        adoptionForm.reset();
        showPage('homePage'); // 送出後返回首頁
    } catch (error) {
        console.error("Error submitting application: ", error);
        alert('送出申請時發生錯誤，請稍後再試。');
    }
});

backToDetailBtn.addEventListener('click', () => {
    if (currentAnimalId && currentAnimalName) {
        showPage('animalDetailPage', { id: currentAnimalId, name: currentAnimalName });
    } else {
        showPage('homePage');
    }
});

// --- 上傳動物資料邏輯 ---
uploadAnimalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('uploadAnimalName').value;
    const age = parseFloat(document.getElementById('uploadAnimalAge').value);
    const species = document.getElementById('uploadAnimalSpecies').value;
    const breed = document.getElementById('uploadAnimalBreed').value;
    const gender = document.getElementById('uploadAnimalGender').value;
    const size = document.getElementById('uploadAnimalSize').value;
    const healthStatus = document.getElementById('uploadAnimalHealthStatus').value;
    const personality = document.getElementById('uploadAnimalPersonality').value;
    const description = document.getElementById('uploadAnimalDescription').value;

    if (!name || isNaN(age) || !species || !gender || !personality) {
        alert('請填寫所有必填欄位。');
        return;
    }

    try {
        await addDoc(collection(db, 'animals'), {
            name: name,
            age: age,
            species: species,
            breed: breed || '',
            gender: gender,
            size: size || '',
            healthStatus: healthStatus || '',
            personality: personality,
            description: description || '',
            isAdopted: false,
            uploadedAt: new Date()
        });
        alert('動物資料上傳成功！');
        uploadAnimalForm.reset();
        showPage('homePage'); // 上傳成功後返回首頁
    } catch (error) {
        console.error("Error adding animal: ", error);
        alert('上傳動物資料時發生錯誤，請稍後再試。');
    }
});

backFromUploadBtn.addEventListener('click', () => {
    showPage('homePage');
});

// --- 導航連結事件 ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAnimals(); // 初始載入動物列表
    showPage('homePage'); // 預設顯示首頁

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('homePage');
    });

    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('homePage');
    });

    navUploadAnimal.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('uploadAnimalPage');
    });

    navAbout.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('about');
    });

    navContact.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('contact');
    });

    backFromAboutBtn.addEventListener('click', () => {
        showPage('homePage');
    });

    backFromContactBtn.addEventListener('click', () => {
        showPage('homePage');
    });
});
