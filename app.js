const { useState, useRef, useEffect } = React;

// ✅ Render.com 배포 서버 URL
const API_URL = 'https://gutbuddy-api.onrender.com';

const GutBuddyApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [activeMeal, setActiveMeal] = useState('lunch');
  const [meals, setMeals] = useState({
    breakfast: { 
      stoolPhotos: [null, null, null],
      foodPhotos: [null, null, null],
      feeling: '', 
      analyzed: false, 
      analysisResult: null 
    },
    lunch: { 
      stoolPhotos: [null, null, null], 
      foodPhotos: [null, null, null], 
      feeling: '', 
      analyzed: false, 
      analysisResult: null 
    },
    dinner: { 
      stoolPhotos: [null, null, null], 
      foodPhotos: [null, null, null], 
      feeling: '', 
      analyzed: false, 
      analysisResult: null 
    }
  });
  const [calendarData, setCalendarData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 저는 GutBuddy AI예요. 오늘 장 건강에 대해 궁금한 점이 있으신가요? 사진을 첨부하면 음식을 분석해드릴게요! 🌿', image: null }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [userStats, setUserStats] = useState({
    level: 3,
    points: 450,
    nextLevelPoints: 600,
    streak: 7,
    totalDays: 23
  });
  const [isSubscribed, setIsSubscribed] = useState(false); // 구독 상태
  const [isAnalyzing, setIsAnalyzing] = useState(null);
  const [quickAnalyzing, setQuickAnalyzing] = useState(false);
  const [quickAnalysisResult, setQuickAnalysisResult] = useState(null); // 빠른 분석 결과
  
  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;
  
  const quickAnalysisRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatImageRef = useRef(null); // 채팅 이미지 첨부용
  
  // File input refs
  const stoolInputRefs = {
    breakfast: [useRef(null), useRef(null), useRef(null)],
    lunch: [useRef(null), useRef(null), useRef(null)],
    dinner: [useRef(null), useRef(null), useRef(null)]
  };
  
  const foodInputRefs = {
    breakfast: [useRef(null), useRef(null), useRef(null)],
    lunch: [useRef(null), useRef(null), useRef(null)],
    dinner: [useRef(null), useRef(null), useRef(null)]
  };

  // Meal navigation
  const mealOrder = ['breakfast', 'lunch', 'dinner'];
  
  const goToPrevMeal = () => {
    const currentIndex = mealOrder.indexOf(activeMeal);
    if (currentIndex > 0) {
      setActiveMeal(mealOrder[currentIndex - 1]);
    }
  };
  
  const goToNextMeal = () => {
    const currentIndex = mealOrder.indexOf(activeMeal);
    if (currentIndex < mealOrder.length - 1) {
      setActiveMeal(mealOrder[currentIndex + 1]);
    }
  };

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNextMeal();
    } else if (isRightSwipe) {
      goToPrevMeal();
    }
  };

  // Calculate totals from meals data
  const getTodayTotals = () => {
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let analyzedMeals = 0;
    let stoolAnalyzed = 0;
    let stoolRatings = [];

    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
      if (meals[mealType].analyzed && meals[mealType].analysisResult) {
        const result = meals[mealType].analysisResult;
        analyzedMeals++;
        
        if (result.calories > 0) {
          totalCalories += result.calories;
          totalCarbs += result.carbs;
          totalProtein += result.protein;
          totalFat += result.fat;
        }
        
        if (result.stoolScore && result.stoolScore !== '분석 없음') {
          stoolAnalyzed++;
          stoolRatings.push(result.stoolScore);
        }
      }
    });

    return { totalCalories, totalCarbs, totalProtein, totalFat, analyzedMeals, stoolAnalyzed, stoolRatings };
  };

  // Generate AI advice
  const generateAIAdvice = () => {
    const totals = getTodayTotals();
    
    if (totals.analyzedMeals === 0) {
      return {
        gutHealth: 0,
        advice: '아직 오늘의 식단 분석이 없어요. 식단 탭에서 음식과 변 사진을 업로드하고 AI 분석을 받아보세요!',
        hasData: false
      };
    }

    let gutHealthScore = 50;
    
    if (totals.stoolAnalyzed > 0) {
      totals.stoolRatings.forEach(rating => {
        if (rating.includes('좋음')) gutHealthScore += 15;
        else if (rating.includes('양호')) gutHealthScore += 10;
        else if (rating.includes('보통')) gutHealthScore += 5;
      });
    }

    const total = totals.totalCarbs + totals.totalProtein + totals.totalFat;
    const fatRatio = total > 0 ? (totals.totalFat / total) * 100 : 0;
    const proteinRatio = total > 0 ? (totals.totalProtein / total) * 100 : 0;
    const carbRatio = total > 0 ? (totals.totalCarbs / total) * 100 : 0;

    if (carbRatio >= 45 && carbRatio <= 65) gutHealthScore += 5;
    if (proteinRatio >= 15 && proteinRatio <= 30) gutHealthScore += 5;
    if (fatRatio >= 15 && fatRatio <= 35) gutHealthScore += 5;
    else if (fatRatio > 40) gutHealthScore -= 10;

    gutHealthScore = Math.min(100, Math.max(0, gutHealthScore));

    let advice = '';
    
    if (fatRatio > 35) {
      advice = `오늘은 기름진 음식을 많이 드셔서 지방 섭취(${totals.totalFat}g)가 높아요. 앞으로는 기름진 음식을 줄이고 식이섬유가 풍부한 채소를 더 드세요.`;
    } else if (proteinRatio < 15 && totals.analyzedMeals > 0) {
      advice = `오늘 단백질 섭취(${totals.totalProtein}g)가 부족해요. 다음 식사에는 계란, 두부, 생선 등 단백질 식품을 추가해보세요.`;
    } else if (carbRatio > 65) {
      advice = `탄수화물 위주의 식사(${totals.totalCarbs}g)를 하셨네요. 혈당 관리를 위해 채소와 단백질을 함께 드시는 것을 권장해요.`;
    } else {
      advice = `오늘 ${totals.analyzedMeals}끼 분석 완료! 총 ${totals.totalCalories}kcal 섭취. 균형 잡힌 식단이에요. 현재 식습관을 유지해주세요!`;
    }

    return { gutHealth: Math.round(gutHealthScore), advice, hasData: true };
  };

  // Generate calendar data with monthly stats
  useEffect(() => {
    const generateCalendarData = () => {
      const data = {};
      const statuses = ['good', 'normal', 'bad'];
      const today = new Date();
      for (let i = 1; i <= today.getDate(); i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const key = date.toISOString().split('T')[0];
        data[key] = statuses[Math.floor(Math.random() * 3)];
      }
      setCalendarData(data);
    };
    generateCalendarData();
  }, []);

  // Get monthly stats for graph
  const getMonthlyStats = () => {
    const good = Object.values(calendarData).filter(s => s === 'good').length;
    const normal = Object.values(calendarData).filter(s => s === 'normal').length;
    const bad = Object.values(calendarData).filter(s => s === 'bad').length;
    const total = good + normal + bad;
    return {
      good, normal, bad, total,
      goodPercent: total > 0 ? (good / total) * 100 : 0,
      normalPercent: total > 0 ? (normal / total) * 100 : 0,
      badPercent: total > 0 ? (bad / total) * 100 : 0,
    };
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Quick analysis
  const handleQuickAnalysis = () => quickAnalysisRef.current?.click();

  const handleQuickAnalysisFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setQuickAnalyzing(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageBase64 = e.target.result;
        
        try {
          // 실제 API 호출
          const response = await fetch(`${API_URL}/api/analyze-stool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 })
          });
          
          const data = await response.json();
          
          if (data.success && data.result.isStool) {
            // 변 분석 성공
            const result = {
              image: imageBase64,
              stoolType: {
                type: data.result.bristolType,
                status: data.result.status,
                emoji: data.result.statusEmoji,
                color: data.result.status === '좋음' ? '#D4AF37' : 
                       data.result.status === '양호' ? '#8BC34A' : '#FF8C00'
              },
              analysis: {
                condition: data.result.condition,
                description: data.result.description,
                colorInfo: data.result.color,
                solutions: data.result.solutions,
                tips: data.result.tip
              },
              analyzedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            
            setQuickAnalysisResult(result);
            setActiveTab('analysis');
          } else if (data.success && !data.result.isStool) {
            // 변 사진이 아님
            alert(data.result.message || '변 사진이 아닙니다. 정확한 분석을 위해 변 사진을 업로드해주세요.');
          } else {
            throw new Error(data.error || '분석 실패');
          }
        } catch (error) {
          console.error('API 호출 오류:', error);
          
          // API 연결 실패 시 데모 모드로 폴백
          const stoolTypes = [
            { type: '브리스톨 4형', status: '좋음', emoji: '👍', color: '#D4AF37' },
            { type: '브리스톨 3형', status: '양호', emoji: '👌', color: '#8BC34A' },
            { type: '브리스톨 5형', status: '보통', emoji: '😐', color: '#FF8C00' },
          ];
          const selectedType = stoolTypes[Math.floor(Math.random() * stoolTypes.length)];
          
          const analysisResults = [
            {
              condition: '건강한 상태',
              description: '변의 형태와 색상이 양호합니다. 현재 장 건강이 좋은 상태예요.',
              solutions: ['현재 식습관을 유지해주세요', '하루 2L 이상 수분 섭취를 계속하세요', '규칙적인 식사 시간을 지켜주세요'],
              tips: '⚠️ 데모 모드: 백엔드 서버에 연결되지 않았습니다.'
            }
          ];
          
          const result = {
            image: imageBase64,
            stoolType: selectedType,
            analysis: analysisResults[0],
            analyzedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isDemo: true
          };
          
          setQuickAnalysisResult(result);
          setActiveTab('analysis');
        }
        
        setQuickAnalyzing(false);
      };
      reader.readAsDataURL(file);
      
      if (quickAnalysisRef.current) quickAnalysisRef.current.value = '';
    }
  };

  // Photo handlers
  const handleStoolPhotoClick = (mealType, index) => stoolInputRefs[mealType][index].current?.click();
  const handleFoodPhotoClick = (mealType, index) => foodInputRefs[mealType][index].current?.click();

  const handleStoolFileChange = (mealType, index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newMeals = { ...meals };
        newMeals[mealType].stoolPhotos[index] = e.target.result;
        newMeals[mealType].analyzed = false;
        newMeals[mealType].analysisResult = null;
        setMeals(newMeals);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFoodFileChange = (mealType, index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newMeals = { ...meals };
        newMeals[mealType].foodPhotos[index] = e.target.result;
        newMeals[mealType].analyzed = false;
        newMeals[mealType].analysisResult = null;
        setMeals(newMeals);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveStoolPhoto = (mealType, index, e) => {
    e.stopPropagation();
    const newMeals = { ...meals };
    newMeals[mealType].stoolPhotos[index] = null;
    newMeals[mealType].analyzed = false;
    newMeals[mealType].analysisResult = null;
    setMeals(newMeals);
  };

  const handleRemoveFoodPhoto = (mealType, index, e) => {
    e.stopPropagation();
    const newMeals = { ...meals };
    newMeals[mealType].foodPhotos[index] = null;
    newMeals[mealType].analyzed = false;
    newMeals[mealType].analysisResult = null;
    setMeals(newMeals);
  };

  const stoolPhotoCount = (mealType) => meals[mealType].stoolPhotos.filter(p => p !== null).length;
  const foodPhotoCount = (mealType) => meals[mealType].foodPhotos.filter(p => p !== null).length;
  const hasAnyPhotos = (mealType) => stoolPhotoCount(mealType) > 0 || foodPhotoCount(mealType) > 0;

  // AI Analysis
  const analyzeMeal = async (mealType) => {
    if (!hasAnyPhotos(mealType)) return;
    
    setIsAnalyzing(mealType);
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const stoolNum = stoolPhotoCount(mealType);
    const foodNum = foodPhotoCount(mealType);
    
    const analysisResult = {
      calories: foodNum > 0 ? 200 + (foodNum * 180) + Math.floor(Math.random() * 100) : 0,
      carbs: foodNum > 0 ? 15 + (foodNum * 18) + Math.floor(Math.random() * 20) : 0,
      protein: foodNum > 0 ? 8 + (foodNum * 10) + Math.floor(Math.random() * 15) : 0,
      fat: foodNum > 0 ? 5 + (foodNum * 6) + Math.floor(Math.random() * 10) : 0,
      stoolScore: stoolNum > 0 ? ['좋음 👍', '양호 👌', '보통 😐'][Math.floor(Math.random() * 2)] : '분석 없음',
      gutImpact: stoolNum > 0 ? '변 상태가 양호합니다. 장 건강이 좋은 상태예요!' : '식단 분석이 완료되었습니다.',
      tips: ['물을 충분히 마셔주세요 💧', '식후 15분 산책을 추천해요 🚶'][Math.floor(Math.random() * 2)]
    };
    
    const newMeals = { ...meals };
    newMeals[mealType].analyzed = true;
    newMeals[mealType].analysisResult = analysisResult;
    setMeals(newMeals);
    
    setUserStats(prev => ({ ...prev, points: Math.min(prev.points + 50, prev.nextLevelPoints) }));
    setIsAnalyzing(null);
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, image: null }]);
    setChatInput('');
    
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply, image: null }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      // API 실패 시 기본 응답
      const responses = [
        '장 건강을 위해 하루 25-30g의 식이섬유 섭취를 권장해요. 🥬',
        '프로바이오틱스는 장내 유익균을 늘려줍니다. 요거트나 김치가 도움이 됩니다.',
        '물을 충분히 마시는 것도 장 건강에 매우 중요해요. 하루 8잔 이상 권장합니다! 💧',
      ];
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responses[Math.floor(Math.random() * responses.length)] + '\n\n(⚠️ 데모 모드)', 
        image: null 
      }]);
    }
  };

  // 채팅에서 이미지 첨부
  const handleChatImageClick = () => chatImageRef.current?.click();
  
  const handleChatImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageBase64 = e.target.result;
        const userMessage = chatInput.trim() || '이 사진을 분석해주세요';
        
        setChatMessages(prev => [...prev, { 
          role: 'user', 
          content: userMessage, 
          image: imageBase64 
        }]);
        setChatInput('');
        
        try {
          const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: userMessage,
              image: imageBase64 
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            setChatMessages(prev => [...prev, { 
              role: 'assistant', 
              content: data.reply, 
              image: null 
            }]);
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          // API 실패 시 기본 응답
          const imageResponses = [
            '사진을 분석해봤어요! 🔍 식이섬유가 풍부한 채소가 보이네요. 장 건강에 좋은 선택이에요!',
            '음식 사진을 확인했어요! 🍽️ 단백질과 탄수화물의 균형이 좋아 보여요.',
            '분석 완료! 📊 건강한 식단이네요. 프로바이오틱스가 풍부한 발효 음식을 추가하면 더 좋아요.',
          ];
          setChatMessages(prev => [...prev, { 
            role: 'assistant', 
            content: imageResponses[Math.floor(Math.random() * imageResponses.length)] + '\n\n(⚠️ 데모 모드)',
            image: null 
          }]);
        }
      };
      reader.readAsDataURL(file);
      if (chatImageRef.current) chatImageRef.current.value = '';
    }
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#D4AF37';
      case 'normal': return '#FF8C00';
      case 'bad': return '#4CAF50';
      default: return '#E0E0E0';
    }
  };

  const mealNames = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
  const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
  
  const getGutHealthColor = (percentage) => {
    if (percentage >= 70) return '#D4AF37';
    if (percentage >= 50) return '#FF8C00';
    return '#4CAF50';
  };

  const todayTotals = getTodayTotals();
  const aiAdvice = generateAIAdvice();
  const monthlyStats = getMonthlyStats();

  return (
    <div style={styles.container}>
      {/* Status Bar */}
      <div style={styles.statusBar}>
        <span style={styles.time}>9:41</span>
        <div style={styles.statusIcons}>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>
          {activeTab === 'home' && '🏠 홈'}
          {activeTab === 'diet' && '🍽️ 식단 기록'}
          {activeTab === 'calendar' && '📅 캘린더'}
          {activeTab === 'analysis' && '🔬 분석'}
          {activeTab === 'my' && '👤 마이'}
        </h1>
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        
        {/* HOME Tab */}
        {activeTab === 'home' && (
          <div style={styles.homeContainer}>
            <div style={styles.gutHealthCard}>
              <div style={styles.gutHealthLeft}>
                <span style={styles.gutHealthLabel}>오늘의 장 상태</span>
                <span style={{...styles.gutHealthPercent, color: aiAdvice.hasData ? getGutHealthColor(aiAdvice.gutHealth) : '#BDBDBD'}}>
                  {aiAdvice.hasData ? `${aiAdvice.gutHealth} %` : '-- %'}
                </span>
              </div>
              <div style={styles.gutHealthRight}>
                <p style={styles.adviceText}>{aiAdvice.advice}</p>
                <span style={styles.adviceTag}>(분석 및 해결책 제시)</span>
              </div>
            </div>

            <div style={styles.caloriesCard}>
              <span style={styles.caloriesLabel}>오늘 칼로리</span>
              <span style={styles.caloriesValue}>{todayTotals.totalCalories > 0 ? `${todayTotals.totalCalories} kcal` : '0 kcal'}</span>
              {todayTotals.analyzedMeals > 0 && <span style={styles.mealsAnalyzed}>{todayTotals.analyzedMeals}끼 분석 완료</span>}
            </div>

            <div style={styles.macrosContainer}>
              <div style={styles.macroCard}>
                <span style={styles.macroLabel}>탄수화물</span>
                <span style={styles.macroGrams}>{todayTotals.totalCarbs}g</span>
                <div style={styles.macroBarContainer}>
                  <div style={{...styles.macroBar, width: `${Math.min((todayTotals.totalCarbs / 300) * 100, 100)}%`}}></div>
                </div>
              </div>
              <div style={styles.macroCard}>
                <span style={styles.macroLabel}>단백질</span>
                <span style={styles.macroGrams}>{todayTotals.totalProtein}g</span>
                <div style={styles.macroBarContainer}>
                  <div style={{...styles.macroBar, width: `${Math.min((todayTotals.totalProtein / 100) * 100, 100)}%`, background: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)'}}></div>
                </div>
              </div>
              <div style={styles.macroCard}>
                <span style={styles.macroLabel}>지방</span>
                <span style={styles.macroGrams}>{todayTotals.totalFat}g</span>
                <div style={styles.macroBarContainer}>
                  <div style={{...styles.macroBar, width: `${Math.min((todayTotals.totalFat / 80) * 100, 100)}%`, background: 'linear-gradient(90deg, #D4AF37 0%, #C49B30 100%)'}}></div>
                </div>
              </div>
            </div>

            <input type="file" accept="image/*" ref={quickAnalysisRef} style={{ display: 'none' }} onChange={handleQuickAnalysisFile} />
            <button style={styles.quickAnalysisButton} onClick={handleQuickAnalysis} disabled={quickAnalyzing}>
              {quickAnalyzing ? (
                <>
                  <span style={styles.quickAnalysisTitle}>⏳ 변 분석 중...</span>
                  <span style={styles.quickAnalysisSubtitle}>잠시만 기다려주세요</span>
                </>
              ) : (
                <>
                  <span style={styles.quickAnalysisTitle}>🚽 빠른 변 분석</span>
                  <span style={styles.quickAnalysisSubtitle}>사진 촬영으로 즉시 분석</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* DIET Tab - Slide UI */}
        {activeTab === 'diet' && (
          <div style={styles.dietContainer}>
            {/* Meal Tab Selector */}
            <div style={styles.mealTabSelector}>
              {mealOrder.map((mealType) => (
                <button
                  key={mealType}
                  style={{
                    ...styles.mealTab,
                    ...(activeMeal === mealType ? styles.mealTabActive : {})
                  }}
                  onClick={() => setActiveMeal(mealType)}
                >
                  <span style={styles.mealTabEmoji}>{mealEmojis[mealType]}</span>
                  <span style={{
                    ...styles.mealTabText,
                    ...(activeMeal === mealType ? styles.mealTabTextActive : {})
                  }}>{mealNames[mealType]}</span>
                  {meals[mealType].analyzed && (
                    <span style={styles.mealTabCheck}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Swipeable Content Area */}
            <div 
              style={styles.mealSlideContainer}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Slide Wrapper */}
              <div style={{
                ...styles.mealSlideWrapper,
                transform: `translateX(-${mealOrder.indexOf(activeMeal) * 100}%)`
              }}>
                {mealOrder.map((mealType) => (
                  <div key={mealType} style={styles.mealSlide}>
                    <div style={styles.mealCard}>
                      {/* Stool Photos Section */}
                      <div style={styles.photoSection}>
                        <div style={styles.sectionHeader}>
                          <span style={styles.sectionIcon}>🚽</span>
                          <span style={styles.sectionTitle}>변 사진</span>
                          <span style={styles.sectionHint}>(동그라미)</span>
                        </div>
                        <div style={styles.photoRow}>
                          {meals[mealType].stoolPhotos.map((photo, index) => (
                            <div key={`stool-${index}`} style={styles.photoWrapper}>
                              <input
                                type="file"
                                accept="image/*"
                                ref={stoolInputRefs[mealType][index]}
                                style={{ display: 'none' }}
                                onChange={(e) => handleStoolFileChange(mealType, index, e)}
                              />
                              <div
                                style={{
                                  ...styles.stoolCircle,
                                  ...(photo ? styles.photoFilled : {})
                                }}
                                onClick={() => handleStoolPhotoClick(mealType, index)}
                              >
                                {photo ? (
                                  <>
                                    <img src={photo} alt="" style={styles.photoImgCircle} />
                                    <button style={styles.removeBtn} onClick={(e) => handleRemoveStoolPhoto(mealType, index, e)}>✕</button>
                                  </>
                                ) : (
                                  <span style={styles.plusIcon}>+</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Food Photos Section */}
                      <div style={styles.photoSection}>
                        <div style={styles.sectionHeader}>
                          <span style={styles.sectionIcon}>🍽️</span>
                          <span style={styles.sectionTitle}>식단 사진</span>
                          <span style={styles.sectionHint}>(네모)</span>
                        </div>
                        <div style={styles.photoRow}>
                          {meals[mealType].foodPhotos.map((photo, index) => (
                            <div key={`food-${index}`} style={styles.photoWrapper}>
                              <input
                                type="file"
                                accept="image/*"
                                ref={foodInputRefs[mealType][index]}
                                style={{ display: 'none' }}
                                onChange={(e) => handleFoodFileChange(mealType, index, e)}
                              />
                              <div
                                style={{
                                  ...styles.foodSquare,
                                  ...(photo ? styles.photoFilled : {})
                                }}
                                onClick={() => handleFoodPhotoClick(mealType, index)}
                              >
                                {photo ? (
                                  <>
                                    <img src={photo} alt="" style={styles.photoImgSquare} />
                                    <button style={styles.removeBtn} onClick={(e) => handleRemoveFoodPhoto(mealType, index, e)}>✕</button>
                                  </>
                                ) : (
                                  <span style={styles.plusIcon}>+</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Feeling Input */}
                      <textarea
                        style={styles.feelingInput}
                        placeholder="식사 후 느낌을 기록해주세요... (배가 편했나요? 더부룩했나요?)"
                        value={meals[mealType].feeling}
                        onChange={(e) => {
                          const newMeals = { ...meals };
                          newMeals[mealType].feeling = e.target.value;
                          setMeals(newMeals);
                        }}
                      />

                      {/* Analyze Button */}
                      <button
                        style={{
                          ...styles.analyzeButton,
                          ...(!hasAnyPhotos(mealType) || isAnalyzing === mealType ? styles.analyzeButtonDisabled : {})
                        }}
                        onClick={() => analyzeMeal(mealType)}
                        disabled={!hasAnyPhotos(mealType) || isAnalyzing === mealType}
                      >
                        {isAnalyzing === mealType ? '⏳ AI가 분석 중...' : '🤖 AI 분석하기'}
                      </button>

                      {!hasAnyPhotos(mealType) && (
                        <p style={styles.noPhotoHint}>💡 사진을 1장 이상 첨부하면 AI 분석이 가능해요</p>
                      )}

                      {/* Analysis Result */}
                      {meals[mealType].analyzed && meals[mealType].analysisResult && (
                        <div style={styles.analysisResultCard}>
                          <div style={styles.analysisHeader}>
                            <span>📊</span>
                            <span style={styles.analysisTitle}>AI 분석 결과</span>
                          </div>

                          {stoolPhotoCount(mealType) > 0 && (
                            <div style={styles.stoolResultBox}>
                              <span>🚽 변 상태: </span>
                              <span style={styles.stoolScoreValue}>{meals[mealType].analysisResult.stoolScore}</span>
                            </div>
                          )}

                          {foodPhotoCount(mealType) > 0 && (
                            <div style={styles.nutritionGrid}>
                              <div style={styles.nutritionItem}>
                                <span style={styles.nutritionValue}>{meals[mealType].analysisResult.calories}</span>
                                <span style={styles.nutritionLabel}>kcal</span>
                              </div>
                              <div style={styles.nutritionItem}>
                                <span style={styles.nutritionValue}>{meals[mealType].analysisResult.carbs}g</span>
                                <span style={styles.nutritionLabel}>탄수화물</span>
                              </div>
                              <div style={styles.nutritionItem}>
                                <span style={styles.nutritionValue}>{meals[mealType].analysisResult.protein}g</span>
                                <span style={styles.nutritionLabel}>단백질</span>
                              </div>
                              <div style={styles.nutritionItem}>
                                <span style={styles.nutritionValue}>{meals[mealType].analysisResult.fat}g</span>
                                <span style={styles.nutritionLabel}>지방</span>
                              </div>
                            </div>
                          )}

                          <div style={styles.tipBanner}>
                            <span>💡</span>
                            <span style={styles.tipContent}>{meals[mealType].analysisResult.tips}</span>
                          </div>

                          <div style={styles.pointsEarned}>🎉 +50 XP 획득!</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Swipe Indicator */}
            <div style={styles.swipeIndicator}>
              {mealOrder.map((mealType, index) => (
                <div
                  key={mealType}
                  style={{
                    ...styles.swipeDot,
                    ...(activeMeal === mealType ? styles.swipeDotActive : {})
                  }}
                />
              ))}
            </div>
            <p style={styles.swipeHint}>← 좌우로 스와이프하여 이동 →</p>
          </div>
        )}

        {/* Calendar Tab with Graph */}
        {activeTab === 'calendar' && (
          <div style={styles.calendarContainer}>
            {/* Monthly Graph */}
            <div style={styles.graphCard}>
              <h3 style={styles.graphTitle}>📊 이번 달 장 상태 그래프</h3>
              
              <div style={styles.barGraphContainer}>
                <div style={styles.barGraphItem}>
                  <div style={styles.barLabelTop}>{monthlyStats.good}일</div>
                  <div style={styles.barWrapper}>
                    <div style={{
                      ...styles.barFill,
                      height: `${monthlyStats.goodPercent}%`,
                      background: 'linear-gradient(180deg, #D4AF37 0%, #B8972E 100%)',
                    }}></div>
                  </div>
                  <div style={styles.barLabel}>좋음</div>
                  <div style={{...styles.barDot, background: '#D4AF37'}}></div>
                </div>
                
                <div style={styles.barGraphItem}>
                  <div style={styles.barLabelTop}>{monthlyStats.normal}일</div>
                  <div style={styles.barWrapper}>
                    <div style={{
                      ...styles.barFill,
                      height: `${monthlyStats.normalPercent}%`,
                      background: 'linear-gradient(180deg, #FF8C00 0%, #E07800 100%)',
                    }}></div>
                  </div>
                  <div style={styles.barLabel}>보통</div>
                  <div style={{...styles.barDot, background: '#FF8C00'}}></div>
                </div>
                
                <div style={styles.barGraphItem}>
                  <div style={styles.barLabelTop}>{monthlyStats.bad}일</div>
                  <div style={styles.barWrapper}>
                    <div style={{
                      ...styles.barFill,
                      height: `${monthlyStats.badPercent}%`,
                      background: 'linear-gradient(180deg, #4CAF50 0%, #388E3C 100%)',
                    }}></div>
                  </div>
                  <div style={styles.barLabel}>나쁨</div>
                  <div style={{...styles.barDot, background: '#4CAF50'}}></div>
                </div>
              </div>

              <div style={styles.graphSummary}>
                <span>총 {monthlyStats.total}일 기록</span>
                <span style={{color: '#D4AF37', fontWeight: '600'}}>좋음 {Math.round(monthlyStats.goodPercent)}%</span>
              </div>
            </div>

            {/* Legend */}
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <span style={{...styles.legendDot, backgroundColor: '#D4AF37'}}></span>
                <span>좋음</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{...styles.legendDot, backgroundColor: '#FF8C00'}}></span>
                <span>보통</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{...styles.legendDot, backgroundColor: '#4CAF50'}}></span>
                <span>나쁨</span>
              </div>
            </div>

            {/* Month Navigation */}
            <div style={styles.monthNav}>
              <button style={styles.monthNavButton} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>‹</button>
              <span style={styles.monthTitle}>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
              <button style={styles.monthNavButton} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>›</button>
            </div>

            {/* Week Days */}
            <div style={styles.weekDays}>
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <span key={day} style={styles.weekDay}>{day}</span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={styles.calendarGrid}>
              {Array(getFirstDayOfMonth(currentMonth)).fill(null).map((_, i) => (
                <div key={`empty-${i}`} style={styles.calendarDay}></div>
              ))}
              {Array(getDaysInMonth(currentMonth)).fill(null).map((_, i) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                const dateKey = date.toISOString().split('T')[0];
                const status = calendarData[dateKey];
                return (
                  <div key={i} style={styles.calendarDay}>
                    <span style={styles.dayNumber}>{i + 1}</span>
                    {status && <span style={{...styles.statusThumb, color: getStatusColor(status)}}>👍</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div style={styles.analysisContainer}>
            {/* 빠른 변 분석 결과 */}
            {quickAnalysisResult && (
              <div style={styles.quickResultCard}>
                <div style={styles.quickResultHeader}>
                  <span style={styles.quickResultBadge}>🚽 빠른 변 분석</span>
                  <span style={styles.quickResultTime}>{quickAnalysisResult.analyzedAt}</span>
                </div>
                
                <div style={styles.quickResultContent}>
                  <div style={styles.quickResultImageBox}>
                    <img src={quickAnalysisResult.image} alt="분석 이미지" style={styles.quickResultImage} />
                  </div>
                  
                  <div style={styles.quickResultInfo}>
                    <div style={styles.stoolTypeBox}>
                      <span style={styles.stoolTypeLabel}>변 형태</span>
                      <span style={styles.stoolTypeName}>{quickAnalysisResult.stoolType.type}</span>
                      <span style={{
                        ...styles.stoolTypeStatus,
                        color: quickAnalysisResult.stoolType.color
                      }}>
                        {quickAnalysisResult.stoolType.emoji} {quickAnalysisResult.stoolType.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.analysisDetailBox}>
                  <h4 style={styles.analysisDetailTitle}>📋 분석 결과</h4>
                  <div style={styles.conditionBox}>
                    <span style={styles.conditionLabel}>상태:</span>
                    <span style={styles.conditionValue}>{quickAnalysisResult.analysis.condition}</span>
                  </div>
                  <p style={styles.analysisDescription}>{quickAnalysisResult.analysis.description}</p>
                </div>

                <div style={styles.solutionsBox}>
                  <h4 style={styles.solutionsTitle}>💡 해결책 및 권장사항</h4>
                  {quickAnalysisResult.analysis.solutions.map((solution, index) => (
                    <div key={index} style={styles.solutionItem}>
                      <span style={styles.solutionNumber}>{index + 1}</span>
                      <span style={styles.solutionText}>{solution}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.tipBox}>
                  <span>🌟</span>
                  <span style={styles.tipText}>{quickAnalysisResult.analysis.tips}</span>
                </div>

                <button 
                  style={styles.clearResultButton}
                  onClick={() => setQuickAnalysisResult(null)}
                >
                  결과 닫기
                </button>
              </div>
            )}

            {/* 오늘의 장 건강 리포트 */}
            <div style={styles.todaySummary}>
              <h3 style={styles.summaryHeader}>📊 오늘의 장 건강 리포트</h3>
              <div style={styles.overallStatus}>
                <span style={styles.bigThumb}>👍</span>
                <span style={{...styles.statusText, color: aiAdvice.hasData ? getGutHealthColor(aiAdvice.gutHealth) : '#BDBDBD'}}>
                  {aiAdvice.hasData ? (aiAdvice.gutHealth >= 70 ? '좋음' : aiAdvice.gutHealth >= 50 ? '보통' : '주의') : '데이터 없음'}
                </span>
              </div>
              <p style={styles.summaryDescription}>{aiAdvice.advice}</p>
            </div>

            <div style={styles.chatContainer}>
              <h3 style={styles.chatHeader}>🤖 GutBuddy AI와 대화하기</h3>
              <div style={styles.chatMessages}>
                {chatMessages.map((msg, index) => (
                  <div key={index} style={{...styles.chatBubble, ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble)}}>
                    {msg.image && (
                      <img src={msg.image} alt="첨부 이미지" style={styles.chatImage} />
                    )}
                    {msg.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={styles.chatInputContainer}>
                <input
                  type="file"
                  accept="image/*"
                  ref={chatImageRef}
                  style={{ display: 'none' }}
                  onChange={handleChatImageChange}
                />
                <button style={styles.imageAttachButton} onClick={handleChatImageClick}>
                  📷
                </button>
                <input
                  type="text"
                  style={styles.chatInput}
                  placeholder="장 건강에 대해 물어보세요..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={styles.sendButton} onClick={sendMessage}>↑</button>
              </div>
              <p style={styles.chatHint}>💡 사진을 첨부하면 AI가 음식을 분석해드려요</p>
            </div>
          </div>
        )}

        {/* My Tab - 구독 관리 */}
        {activeTab === 'my' && (
          <div style={styles.myContainer}>
            {/* 프로필 헤더 */}
            <div style={styles.profileHeader}>
              <div style={styles.avatarSmall}>🌱</div>
              <div style={styles.profileInfo}>
                <h2 style={styles.userNameSmall}>GutBuddy 사용자</h2>
                <p style={styles.memberStatus}>
                  {isSubscribed ? '프리미엄 회원' : '무료 회원'}
                </p>
              </div>
            </div>

            {/* 구독 상태에 따른 표시 */}
            {isSubscribed ? (
              // 구독 중인 회원
              <div style={styles.subscribedContainer}>
                <div style={styles.subscribedCard}>
                  <div style={styles.subscribedBadge}>✨ Premium</div>
                  <h3 style={styles.subscribedTitle}>프리미엄 구독 중</h3>
                  <p style={styles.subscribedDesc}>모든 프리미엄 기능을 이용 중이에요</p>
                  <p style={styles.nextPayment}>다음 결제일: 2025년 2월 14일</p>
                </div>

                <div style={styles.benefitsCard}>
                  <h4 style={styles.benefitsTitle}>이용 중인 혜택</h4>
                  <div style={styles.benefitItem}>
                    <span style={styles.benefitIcon}>✓</span>
                    <span style={styles.benefitText}>무제한 AI 음식 분석</span>
                  </div>
                  <div style={styles.benefitItem}>
                    <span style={styles.benefitIcon}>✓</span>
                    <span style={styles.benefitText}>상세 장 건강 리포트</span>
                  </div>
                  <div style={styles.benefitItem}>
                    <span style={styles.benefitIcon}>✓</span>
                    <span style={styles.benefitText}>GutBuddy AI 채팅 무제한</span>
                  </div>
                  <div style={styles.benefitItem}>
                    <span style={styles.benefitIcon}>✓</span>
                    <span style={styles.benefitText}>개인 맞춤 식단 추천</span>
                  </div>
                </div>

                <div style={styles.managementSection}>
                  <button style={styles.manageButton}>
                    <span>💳</span>
                    <span style={styles.manageText}>결제 수단 관리</span>
                  </button>
                  <button style={{...styles.manageButton, ...styles.cancelBtn}}>
                    <span>❌</span>
                    <span style={styles.manageText}>구독 해지</span>
                  </button>
                </div>

                {/* 테스트용 토글 */}
                <button 
                  style={styles.testToggle}
                  onClick={() => setIsSubscribed(false)}
                >
                  (테스트) 비구독 상태로 전환
                </button>
              </div>
            ) : (
              // 구독 안한 회원
              <div style={styles.unsubscribedContainer}>
                <div style={styles.promoCard}>
                  <div style={styles.promoHeader}>
                    <span style={styles.promoEmoji}>🌟</span>
                    <h3 style={styles.promoTitle}>GutBuddy Premium</h3>
                  </div>
                  <p style={styles.promoDesc}>
                    AI 기반 맞춤형 장 건강 관리로<br/>
                    더 건강한 일상을 시작하세요
                  </p>
                  <div style={styles.priceBox}>
                    <span style={styles.priceLabel}>월</span>
                    <span style={styles.priceValue}>4,900</span>
                    <span style={styles.priceCurrency}>원</span>
                  </div>
                </div>

                <div style={styles.featuresCard}>
                  <h4 style={styles.featuresTitle}>프리미엄 혜택</h4>
                  <div style={styles.featureItem}>
                    <span style={styles.featureIcon}>🤖</span>
                    <div style={styles.featureContent}>
                      <span style={styles.featureName}>무제한 AI 분석</span>
                      <span style={styles.featureDesc}>음식, 변 사진 무제한 분석</span>
                    </div>
                  </div>
                  <div style={styles.featureItem}>
                    <span style={styles.featureIcon}>📊</span>
                    <div style={styles.featureContent}>
                      <span style={styles.featureName}>상세 리포트</span>
                      <span style={styles.featureDesc}>주간/월간 장 건강 리포트</span>
                    </div>
                  </div>
                  <div style={styles.featureItem}>
                    <span style={styles.featureIcon}>💬</span>
                    <div style={styles.featureContent}>
                      <span style={styles.featureName}>AI 채팅 무제한</span>
                      <span style={styles.featureDesc}>GutBuddy AI와 무제한 상담</span>
                    </div>
                  </div>
                  <div style={styles.featureItem}>
                    <span style={styles.featureIcon}>🥗</span>
                    <div style={styles.featureContent}>
                      <span style={styles.featureName}>맞춤 식단 추천</span>
                      <span style={styles.featureDesc}>장 건강에 맞는 개인화 식단</span>
                    </div>
                  </div>
                </div>

                <button 
                  style={styles.subscribeButton}
                  onClick={() => setIsSubscribed(true)}
                >
                  <span style={styles.subscribeBtnText}>프리미엄 시작하기</span>
                  <span style={styles.subscribeBtnSub}>월 4,900원</span>
                </button>

                <p style={styles.cancelNote}>언제든지 해지 가능 • 첫 7일 무료</p>

                {/* 테스트용 토글 */}
                <button 
                  style={styles.testToggle}
                  onClick={() => setIsSubscribed(true)}
                >
                  (테스트) 구독 상태로 전환
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={styles.bottomNav}>
        {['home', 'diet', 'calendar', 'analysis', 'my'].map((tab) => (
          <button
            key={tab}
            style={{...styles.navItem, ...(activeTab === tab ? styles.navItemActive : {})}}
            onClick={() => setActiveTab(tab)}
          >
            <span style={styles.navIcon}>
              {tab === 'home' && '🏠'}
              {tab === 'diet' && '🍽️'}
              {tab === 'calendar' && '📅'}
              {tab === 'analysis' && '🔬'}
              {tab === 'my' && '👤'}
            </span>
            <span style={{...styles.navLabel, ...(activeTab === tab ? styles.navLabelActive : {})}}>
              {tab === 'home' && '홈'}
              {tab === 'diet' && '식단'}
              {tab === 'calendar' && '캘린더'}
              {tab === 'analysis' && '분석'}
              {tab === 'my' && '마이'}
            </span>
          </button>
        ))}
      </div>

      <div style={styles.homeIndicator}><div style={styles.homeBar}></div></div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '430px',
    minHeight: '100vh',
    margin: '0 auto',
    background: 'linear-gradient(180deg, #FFF9F0 0%, #FFF5E6 100%)',
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  statusBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px 8px', fontSize: '14px', fontWeight: '600' },
  time: { fontWeight: '600' },
  statusIcons: { display: 'flex', gap: '6px', fontSize: '12px' },
  header: { padding: '8px 20px 12px' },
  headerTitle: { fontSize: '22px', fontWeight: '700', color: '#2D2A26', margin: 0 },
  content: { flex: 1, overflowY: 'auto', paddingBottom: '100px', minHeight: 'calc(100vh - 180px)' },

  // Home Tab
  homeContainer: { padding: '0 20px' },
  gutHealthCard: { background: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)', display: 'flex', gap: '14px' },
  gutHealthLeft: { flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', background: '#FFF9F0', borderRadius: '16px', minWidth: '110px' },
  gutHealthLabel: { fontSize: '12px', color: '#8B7355', marginBottom: '8px' },
  gutHealthPercent: { fontSize: '34px', fontWeight: '700' },
  gutHealthRight: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 16px', background: '#FFF9F0', borderRadius: '16px' },
  adviceText: { fontSize: '13px', color: '#5D5A56', lineHeight: '1.6', margin: '0 0 8px 0' },
  adviceTag: { fontSize: '11px', color: '#D4AF37', fontWeight: '500' },
  caloriesCard: { background: 'white', borderRadius: '16px', padding: '18px 24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  caloriesLabel: { fontSize: '13px', color: '#8B7355', marginBottom: '6px' },
  caloriesValue: { fontSize: '32px', fontWeight: '700', color: '#D4AF37' },
  mealsAnalyzed: { fontSize: '12px', color: '#4CAF50', marginTop: '6px', fontWeight: '500' },
  macrosContainer: { display: 'flex', gap: '12px', marginBottom: '20px' },
  macroCard: { flex: 1, background: 'white', borderRadius: '16px', padding: '16px 12px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  macroLabel: { fontSize: '12px', color: '#5D5A56', marginBottom: '6px', fontWeight: '500' },
  macroGrams: { fontSize: '20px', fontWeight: '700', color: '#2D2A26', marginBottom: '10px' },
  macroBarContainer: { width: '100%', height: '6px', background: '#F0E6D3', borderRadius: '3px', overflow: 'hidden' },
  macroBar: { height: '100%', background: 'linear-gradient(90deg, #5BC0DE 0%, #3AA8C9 100%)', borderRadius: '3px' },
  quickAnalysisButton: { width: '100%', padding: '20px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' },
  quickAnalysisTitle: { fontSize: '17px', fontWeight: '600' },
  quickAnalysisSubtitle: { fontSize: '13px', opacity: 0.9 },

  // Diet Tab - New Slide UI
  dietContainer: { padding: '0 16px' },
  mealTabSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    background: 'white',
    borderRadius: '16px',
    padding: '8px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)',
  },
  mealTab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  mealTabActive: {
    background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)',
  },
  mealTabEmoji: {
    fontSize: '24px',
  },
  mealTabText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#8B7355',
  },
  mealTabTextActive: {
    color: 'white',
  },
  mealTabCheck: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    fontSize: '10px',
    color: '#4CAF50',
    background: 'white',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlideContainer: {
    overflow: 'hidden',
    borderRadius: '20px',
  },
  mealSlideWrapper: {
    display: 'flex',
    transition: 'transform 0.3s ease',
  },
  mealSlide: {
    flex: '0 0 100%',
    minWidth: '100%',
  },
  mealCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)',
  },
  photoSection: {
    marginBottom: '16px',
    padding: '14px',
    background: '#FFF9F0',
    borderRadius: '14px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionIcon: { fontSize: '18px' },
  sectionTitle: { fontSize: '14px', fontWeight: '600', color: '#2D2A26' },
  sectionHint: { fontSize: '12px', color: '#9E9E9E', marginLeft: 'auto' },
  photoRow: { display: 'flex', justifyContent: 'center', gap: '12px' },
  photoWrapper: { position: 'relative' },
  stoolCircle: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    border: '3px dashed #8B7355',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    background: 'white',
    position: 'relative',
  },
  foodSquare: {
    width: '70px',
    height: '70px',
    borderRadius: '12px',
    border: '3px dashed #D4AF37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    background: 'white',
    position: 'relative',
  },
  photoFilled: { borderStyle: 'solid' },
  photoImgCircle: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  photoImgSquare: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px' },
  plusIcon: { fontSize: '24px', color: '#8B7355', fontWeight: '300' },
  removeBtn: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: 'none',
    background: '#FF5252',
    color: 'white',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingInput: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #E8E4DC',
    fontSize: '14px',
    resize: 'none',
    height: '70px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: '#FAFAFA',
  },
  analyzeButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  analyzeButtonDisabled: { background: '#E0E0E0', cursor: 'not-allowed' },
  noPhotoHint: { fontSize: '12px', color: '#9E9E9E', textAlign: 'center', margin: '10px 0 0 0' },
  analysisResultCard: {
    marginTop: '16px',
    padding: '16px',
    background: 'linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%)',
    borderRadius: '14px',
    border: '1px solid #F0E6D3',
  },
  analysisHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  analysisTitle: { fontSize: '15px', fontWeight: '600', color: '#2D2A26' },
  stoolResultBox: {
    padding: '12px',
    background: '#F5F0E8',
    borderRadius: '10px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  stoolScoreValue: { fontWeight: '600', color: '#D4AF37' },
  nutritionGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' },
  nutritionItem: { textAlign: 'center', padding: '10px 6px', background: 'white', borderRadius: '10px' },
  nutritionValue: { display: 'block', fontSize: '16px', fontWeight: '700', color: '#D4AF37' },
  nutritionLabel: { fontSize: '10px', color: '#8B7355' },
  tipBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: '#E3F2FD',
    borderRadius: '10px',
    marginBottom: '12px',
  },
  tipContent: { fontSize: '13px', color: '#1565C0', fontWeight: '500' },
  pointsEarned: {
    textAlign: 'center',
    padding: '10px',
    background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#F9A825',
  },
  swipeIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '16px',
  },
  swipeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#E0E0E0',
    transition: 'all 0.3s ease',
  },
  swipeDotActive: {
    background: '#D4AF37',
    width: '24px',
    borderRadius: '4px',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#8B7355',
    marginTop: '8px',
  },

  // Calendar Tab
  calendarContainer: { padding: '0 16px' },
  graphCard: { background: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)' },
  graphTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px', margin: '0 0 20px 0', color: '#2D2A26' },
  barGraphContainer: { display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '150px', marginBottom: '16px' },
  barGraphItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' },
  barLabelTop: { fontSize: '14px', fontWeight: '700', color: '#2D2A26', marginBottom: '8px' },
  barWrapper: { width: '50px', height: '100px', background: '#F5F0E8', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' },
  barFill: { width: '100%', borderRadius: '8px', transition: 'height 0.5s ease' },
  barLabel: { marginTop: '10px', fontSize: '13px', fontWeight: '600', color: '#5D5A56' },
  barDot: { width: '10px', height: '10px', borderRadius: '50%', marginTop: '6px' },
  graphSummary: { display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #F0E6D3', fontSize: '13px', color: '#8B7355' },
  legend: { display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#5D5A56' },
  legendDot: { width: '12px', height: '12px', borderRadius: '50%' },
  monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 10px' },
  monthNavButton: { width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'white', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  monthTitle: { fontSize: '16px', fontWeight: '600', color: '#2D2A26' },
  weekDays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' },
  weekDay: { fontSize: '11px', color: '#8B7355', fontWeight: '500' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', background: 'white', borderRadius: '16px', padding: '12px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)' },
  calendarDay: { aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' },
  dayNumber: { fontSize: '12px', color: '#2D2A26' },
  statusThumb: { fontSize: '12px' },

  // Analysis Tab
  analysisContainer: { padding: '0 20px' },
  
  // 빠른 변 분석 결과 스타일
  quickResultCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.12)',
    border: '2px solid #D4AF37',
  },
  quickResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  quickResultBadge: {
    background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)',
    color: 'white',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  quickResultTime: {
    fontSize: '12px',
    color: '#8B7355',
  },
  quickResultContent: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  quickResultImageBox: {
    flex: '0 0 100px',
  },
  quickResultImage: {
    width: '100px',
    height: '100px',
    borderRadius: '12px',
    objectFit: 'cover',
  },
  quickResultInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  stoolTypeBox: {
    background: '#FFF9F0',
    borderRadius: '12px',
    padding: '14px',
    textAlign: 'center',
  },
  stoolTypeLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#8B7355',
    marginBottom: '4px',
  },
  stoolTypeName: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '700',
    color: '#2D2A26',
    marginBottom: '6px',
  },
  stoolTypeStatus: {
    fontSize: '15px',
    fontWeight: '600',
  },
  analysisDetailBox: {
    background: '#FFF9F0',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '16px',
  },
  analysisDetailTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    color: '#2D2A26',
  },
  conditionBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  conditionLabel: {
    fontSize: '13px',
    color: '#8B7355',
  },
  conditionValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D4AF37',
  },
  analysisDescription: {
    fontSize: '13px',
    color: '#5D5A56',
    lineHeight: '1.6',
    margin: 0,
  },
  solutionsBox: {
    background: '#F0FFF4',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '16px',
  },
  solutionsTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 14px 0',
    color: '#2D2A26',
  },
  solutionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  solutionNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#4CAF50',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  solutionText: {
    fontSize: '13px',
    color: '#2D2A26',
    lineHeight: '1.5',
  },
  tipBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px',
    background: '#FFF8E1',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  tipText: {
    fontSize: '13px',
    color: '#F9A825',
    fontWeight: '500',
  },
  clearResultButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #E0E0E0',
    background: 'white',
    color: '#8B7355',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  todaySummary: { background: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)' },
  summaryHeader: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' },
  overallStatus: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  bigThumb: { fontSize: '48px' },
  statusText: { fontSize: '24px', fontWeight: '700' },
  summaryDescription: { fontSize: '14px', color: '#5D5A56', lineHeight: '1.7' },
  chatContainer: { background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)' },
  chatHeader: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' },
  chatMessages: { height: '220px', overflowY: 'auto', marginBottom: '12px' },
  chatBubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: '16px', marginBottom: '8px', fontSize: '13px', lineHeight: '1.4' },
  userBubble: { marginLeft: 'auto', background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)', color: 'white', borderBottomRightRadius: '4px' },
  assistantBubble: { marginRight: 'auto', background: '#F5F2ED', color: '#2D2A26', borderBottomLeftRadius: '4px' },
  chatImage: { 
    width: '100%', 
    maxWidth: '180px', 
    borderRadius: '10px', 
    marginBottom: '8px', 
    display: 'block' 
  },
  chatInputContainer: { display: 'flex', gap: '8px', alignItems: 'center' },
  imageAttachButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid #E8E4DC',
    background: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatInput: { flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #E8E4DC', fontSize: '13px', outline: 'none' },
  sendButton: { width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  chatHint: { fontSize: '11px', color: '#8B7355', textAlign: 'center', marginTop: '10px' },

  // My Tab - 구독 중심
  myContainer: { padding: '0 20px' },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'white',
    borderRadius: '16px',
    padding: '16px 20px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)',
  },
  avatarSmall: { fontSize: '40px' },
  profileInfo: { flex: 1 },
  userNameSmall: { fontSize: '18px', fontWeight: '600', margin: '0 0 2px 0', color: '#2D2A26' },
  memberStatus: { fontSize: '13px', color: '#8B7355', margin: 0 },

  // 구독 중인 회원 스타일
  subscribedContainer: {},
  subscribedCard: {
    background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '16px',
    color: 'white',
    textAlign: 'center',
  },
  subscribedBadge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.25)',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  subscribedTitle: { fontSize: '22px', fontWeight: '700', margin: '0 0 8px 0' },
  subscribedDesc: { fontSize: '14px', opacity: 0.9, margin: '0 0 12px 0' },
  nextPayment: { fontSize: '12px', opacity: 0.8, margin: 0 },
  benefitsCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)',
  },
  benefitsTitle: { fontSize: '15px', fontWeight: '600', margin: '0 0 16px 0', color: '#2D2A26' },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #F5F0E8',
  },
  benefitIcon: { color: '#4CAF50', fontWeight: '600', fontSize: '14px' },
  benefitText: { fontSize: '14px', color: '#5D5A56' },
  managementSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  manageButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '16px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'white',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(139, 109, 76, 0.06)',
  },
  manageText: { fontSize: '15px', fontWeight: '500', color: '#2D2A26' },
  cancelBtn: { background: '#FFF5F5' },

  // 비구독 회원 스타일
  unsubscribedContainer: {},
  promoCard: {
    background: 'linear-gradient(135deg, #2D2A26 0%, #4A4540 100%)',
    borderRadius: '24px',
    padding: '28px 24px',
    marginBottom: '20px',
    color: 'white',
    textAlign: 'center',
  },
  promoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  promoEmoji: { fontSize: '28px' },
  promoTitle: { fontSize: '22px', fontWeight: '700', margin: 0 },
  promoDesc: { fontSize: '14px', opacity: 0.85, lineHeight: '1.6', margin: '0 0 20px 0' },
  priceBox: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
  },
  priceLabel: { fontSize: '16px', opacity: 0.8 },
  priceValue: { fontSize: '42px', fontWeight: '700', color: '#D4AF37' },
  priceCurrency: { fontSize: '18px', opacity: 0.8 },
  featuresCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(139, 109, 76, 0.08)',
  },
  featuresTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0', color: '#2D2A26' },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #F5F0E8',
  },
  featureIcon: { fontSize: '24px' },
  featureContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  featureName: { fontSize: '15px', fontWeight: '600', color: '#2D2A26' },
  featureDesc: { fontSize: '12px', color: '#8B7355' },
  subscribeButton: {
    width: '100%',
    padding: '18px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
  },
  subscribeBtnText: { fontSize: '17px', fontWeight: '600', color: 'white' },
  subscribeBtnSub: { fontSize: '13px', color: 'rgba(255,255,255,0.85)' },
  cancelNote: { textAlign: 'center', fontSize: '12px', color: '#8B7355', marginTop: '12px' },
  testToggle: {
    width: '100%',
    padding: '12px',
    marginTop: '20px',
    borderRadius: '10px',
    border: '1px dashed #E0E0E0',
    background: 'transparent',
    color: '#9E9E9E',
    fontSize: '12px',
    cursor: 'pointer',
  },

  // Bottom Navigation
  bottomNav: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '398px', display: 'flex', justifyContent: 'space-around', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '8px 4px', boxShadow: '0 8px 32px rgba(139, 109, 76, 0.15)' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 10px', borderRadius: '12px', border: 'none', background: 'transparent', cursor: 'pointer' },
  navItemActive: { background: 'linear-gradient(135deg, #D4AF37 0%, #C49B30 100%)' },
  navIcon: { fontSize: '18px' },
  navLabel: { fontSize: '9px', fontWeight: '600', color: '#5D5A56' },
  navLabelActive: { color: 'white' },
  homeIndicator: { position: 'fixed', bottom: '6px', left: '50%', transform: 'translateX(-50%)' },
  homeBar: { width: '120px', height: '4px', background: '#2D2A26', borderRadius: '2px' },
};

// React 앱 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(GutBuddyApp));
