/* ====================================================
   Zenith Money - Main Application Logic & State Engine
   ==================================================== */

(function() {
  'use strict';

  // ==================================================
  // 1. DATA MODELS & INITIAL STATE DEFINITIONS
  // ==================================================

  const DEFAULT_CATEGORIES = [
    { id: 'cat_food', name: '食費', icon: 'restaurant', color: 'hsl(14, 90%, 60%)', type: 'expense', fixed: false },
    { id: 'cat_daily', name: '日用品', icon: 'shopping_bag', color: 'hsl(190, 80%, 50%)', type: 'expense', fixed: false },
    { id: 'cat_housing', name: '住居', icon: 'home', color: 'hsl(220, 80%, 60%)', type: 'expense', fixed: true },
    { id: 'cat_comm', name: '通信・光熱', icon: 'wifi', color: 'hsl(270, 75%, 60%)', type: 'expense', fixed: true },
    { id: 'cat_trans', name: '交通', icon: 'directions_bus', color: 'hsl(40, 90%, 55%)', type: 'expense', fixed: false },
    { id: 'cat_ent', name: '娯楽・教養', icon: 'sports_esports', color: 'hsl(330, 80%, 60%)', type: 'expense', fixed: false },
    { id: 'cat_med', name: '医療・健康', icon: 'medical_services', color: 'hsl(160, 75%, 45%)', type: 'expense', fixed: false },
    { id: 'cat_sub', name: 'サブスク', icon: 'subscriptions', color: 'hsl(250, 70%, 60%)', type: 'expense', fixed: true },
    { id: 'cat_misc', name: 'その他・雑費', icon: 'more_horiz', color: 'hsl(210, 20%, 60%)', type: 'expense', fixed: false },
    { id: 'cat_salary', name: '給与・賞与', icon: 'payments', color: 'hsl(155, 75%, 45%)', type: 'income', fixed: false },
    { id: 'cat_side', name: '副業・雑収入', icon: 'work', color: 'hsl(170, 80%, 45%)', type: 'income', fixed: false },
    { id: 'cat_transfer', name: '口座振替', icon: 'sync_alt', color: 'hsl(258, 90%, 66%)', type: 'transfer', fixed: false }
  ];

  const DEFAULT_ACCOUNTS = [
    { id: 'acc_cash', name: '現金 (財布)', type: 'cash', balance: 35000, icon: 'payments', is_mock_sync: false },
    { id: 'acc_mufg', name: '三菱UFJ銀行', type: 'bank', balance: 1200000, icon: 'account_balance', is_mock_sync: true },
    { id: 'acc_rakuten_bank', name: '楽天銀行', type: 'bank', balance: 850000, icon: 'account_balance', is_mock_sync: true },
    { id: 'acc_paypay', name: 'PayPay電子マネー', type: 'e_money', balance: 15000, icon: 'qr_code_2', is_mock_sync: true },
    { id: 'acc_suica', name: '交通系Suica', type: 'e_money', balance: 5000, icon: 'credit_card', is_mock_sync: true },
    { id: 'acc_sec', name: '楽天証券 (つみたてNISA)', type: 'investment', balance: 345000, icon: 'show_chart', is_mock_sync: true },
    { id: 'acc_card', name: '楽天カード (負債)', type: 'liability', balance: -200000, icon: 'credit_card', is_mock_sync: true }
  ];

  const DEFAULT_BUDGETS = {
    overall: 200000,
    categories: {
      'cat_food': 50000,
      'cat_daily': 20000,
      'cat_housing': 70000,
      'cat_comm': 15000,
      'cat_ent': 25000,
      'cat_trans': 10000,
      'cat_sub': 10000
    }
  };

  const DEFAULT_SAVINGS_GOALS = [
    { id: 'goal_1', title: '100万円貯蓄プロジェクト', target_amount: 1000000, current_amount: 420000, target_date: '2027-03-31', icon: 'savings', is_primary: true },
    { id: 'goal_2', title: 'ハワイ海外旅行資金', target_amount: 350000, current_amount: 120000, target_date: '2027-08-15', icon: 'flight_takeoff', is_primary: false },
    { id: 'goal_3', title: '緊急生活予備資金', target_amount: 500000, current_amount: 500000, target_date: '2026-12-31', icon: 'shield', is_primary: false }
  ];

  // State Store
  let appState = {
    currentYearMonth: getCurrentYearMonthStr(),
    activeTab: 'tab-home',
    theme: 'dark', // 'dark' | 'light'
    selectedAssetRange: '1M',
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    accounts: DEFAULT_ACCOUNTS,
    budgets: DEFAULT_BUDGETS,
    savingsGoals: DEFAULT_SAVINGS_GOALS,
    aiInsights: [],
    deletedTransactionStack: [],
    inputModalState: {
      type: 'expense',
      categoryId: 'cat_food',
      amountStr: '0',
      merchant: '',
      date: getTodayStr(),
      accountId: 'acc_cash',
      toAccountId: 'acc_mufg',
      memo: '',
      tags: ''
    }
  };

  // Chart Instances
  let charts = {
    donut: null,
    bar: null,
    trend: null
  };

  // ==================================================
  // 2. HELPER UTILITIES
  // ==================================================

  function getCurrentYearMonthStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatYen(amount) {
    const num = Math.round(Number(amount) || 0);
    const sign = num > 0 ? '+' : '';
    return (num < 0 ? '-' : sign) + '¥' + Math.abs(num).toLocaleString('ja-JP');
  }

  function formatYenPlain(amount) {
    const num = Math.round(Number(amount) || 0);
    return (num < 0 ? '-' : '') + '¥' + Math.abs(num).toLocaleString('ja-JP');
  }

  function generateUUID() {
    return 'tx_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function getCategoryById(id) {
    return appState.categories.find(c => c.id === id) || appState.categories[0];
  }

  function getAccountById(id) {
    return appState.accounts.find(a => a.id === id) || appState.accounts[0];
  }

  // ==================================================
  // 3. SAMPLE DATA GENERATOR
  // ==================================================

  function generateSampleTransactions() {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curYM = `${curY}-${String(curM).padStart(2, '0')}`;

    const prevDate = new Date(curY, curM - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth() + 1;
    const prevYM = `${prevY}-${String(prevM).padStart(2, '0')}`;

    const sampleTxs = [
      // Current Month
      { id: 'tx_cur_1', type: 'income', amount: 320000, date: `${curYM}-25`, category_id: 'cat_salary', account_id: 'acc_mufg', merchant: '株式会社TechCorporate', memo: `${curM}月分給与手当`, tags: ['#給与'], source: 'manual', user_verified: true },
      { id: 'tx_cur_2', type: 'expense', amount: 75000, date: `${curYM}-27`, category_id: 'cat_housing', account_id: 'acc_mufg', merchant: 'グランドハイツ家賃', memo: `${curM}月分家賃振込`, tags: ['#固定費'], source: 'manual', user_verified: true },
      { id: 'tx_cur_3', type: 'expense', amount: 3280, date: `${curYM}-18`, category_id: 'cat_food', account_id: 'acc_cash', merchant: 'スーパーマルエツ', memo: '夕食食材買い出し', tags: ['#自炊'], source: 'ocr', user_verified: true },
      { id: 'tx_cur_4', type: 'expense', amount: 450, date: `${curYM}-18`, category_id: 'cat_food', account_id: 'acc_cash', merchant: 'セブンイレブン', memo: 'アイス・アイスコーヒー', tags: [], source: 'ai', user_verified: true },
      { id: 'tx_cur_5', type: 'expense', amount: 12400, date: `${curYM}-15`, category_id: 'cat_food', account_id: 'acc_card', merchant: '叙々苑 恵比寿店', memo: '友人との外食ディナー', tags: ['#外食', '#贅沢'], source: 'manual', user_verified: true },
      { id: 'tx_cur_6', type: 'expense', amount: 4200, date: `${curYM}-14`, category_id: 'cat_food', account_id: 'acc_paypay', merchant: 'らーめん吉村家', memo: 'ランチラーメン', tags: ['#外食'], source: 'manual', user_verified: true },
      { id: 'tx_cur_7', type: 'expense', amount: 8900, date: `${curYM}-12`, category_id: 'cat_daily', account_id: 'acc_card', merchant: 'マツモトキヨシ', memo: '日用品・洗剤・化粧水', tags: [], source: 'manual', user_verified: true },
      { id: 'tx_cur_8', type: 'expense', amount: 9800, date: `${curYM}-10`, category_id: 'cat_comm', account_id: 'acc_card', merchant: 'NTTドコモ / 光回線', memo: 'スマホ・光通信費', tags: ['#固定費'], source: 'manual', user_verified: true },
      { id: 'tx_cur_9', type: 'expense', amount: 1480, date: `${curYM}-08`, category_id: 'cat_sub', account_id: 'acc_card', merchant: 'Netflix', memo: '月額プレミアムプラン', tags: ['#サブスク'], source: 'manual', user_verified: true },
      { id: 'tx_cur_10', type: 'expense', amount: 1080, date: `${curYM}-08`, category_id: 'cat_sub', account_id: 'acc_card', merchant: 'Spotify Premium', memo: '音楽サブスク', tags: ['#サブスク'], source: 'manual', user_verified: true },
      { id: 'tx_cur_11', type: 'expense', amount: 15400, date: `${curYM}-05`, category_id: 'cat_ent', account_id: 'acc_card', merchant: 'Steam / 任天堂', memo: '新作ゲームソフト購入', tags: ['#趣味'], source: 'manual', user_verified: true },
      { id: 'tx_cur_12', type: 'expense', amount: 5000, date: `${curYM}-03`, category_id: 'cat_trans', account_id: 'acc_suica', merchant: 'JR東日本 Suicaチャージ', memo: '交通費チャージ', tags: [], source: 'manual', user_verified: true },
      { id: 'tx_cur_tr1', type: 'transfer', amount: 30000, date: `${curYM}-01`, category_id: 'cat_transfer', account_id: 'acc_mufg', to_account_id: 'acc_cash', merchant: '三菱UFJ ATM出金', memo: '現金3万円の引き出し', tags: ['#振替'], source: 'manual', user_verified: true },

      // Previous Month
      { id: 'tx_prev_1', type: 'income', amount: 320000, date: `${prevYM}-25`, category_id: 'cat_salary', account_id: 'acc_mufg', merchant: '株式会社TechCorporate', memo: `${prevM}月分給与手当`, tags: ['#給与'], source: 'manual', user_verified: true },
      { id: 'tx_prev_2', type: 'expense', amount: 75000, date: `${prevYM}-27`, category_id: 'cat_housing', account_id: 'acc_mufg', merchant: 'グランドハイツ家賃', memo: `${prevM}月分家賃`, tags: ['#固定費'], source: 'manual', user_verified: true },
      { id: 'tx_prev_3', type: 'expense', amount: 12400, date: `${prevYM}-20`, category_id: 'cat_food', account_id: 'acc_card', merchant: '居酒屋和民', memo: `${prevM}月外食計`, tags: ['#外食'], source: 'manual', user_verified: true },
      { id: 'tx_prev_4', type: 'expense', amount: 18200, date: `${prevYM}-15`, category_id: 'cat_food', account_id: 'acc_cash', merchant: 'イオンモール食料品', memo: '自炊食材まとめ買い', tags: [], source: 'manual', user_verified: true },
      { id: 'tx_prev_5', type: 'expense', amount: 11200, date: `${prevYM}-10`, category_id: 'cat_daily', account_id: 'acc_card', merchant: '日用品・ドラッグストア', memo: `${prevM}月日用品`, tags: [], source: 'manual', user_verified: true },
      { id: 'tx_prev_6', type: 'expense', amount: 9800, date: `${prevYM}-08`, category_id: 'cat_comm', account_id: 'acc_card', merchant: 'NTTドコモ', memo: `${prevM}月通信費`, tags: [], source: 'manual', user_verified: true }
    ];

    return sampleTxs;
  }

  // ==================================================
  // 4. LOCAL STORAGE ENGINE
  // ==================================================

  function saveStateToStorage() {
    try {
      localStorage.setItem('zenith_money_state_v3', JSON.stringify({
        transactions: appState.transactions,
        categories: appState.categories,
        accounts: appState.accounts,
        budgets: appState.budgets,
        savingsGoals: appState.savingsGoals,
        selectedAssetRange: appState.selectedAssetRange,
        theme: appState.theme
      }));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  function loadStateFromStorage() {
    try {
      const saved = localStorage.getItem('zenith_money_state_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) {
          appState.transactions = parsed.transactions;
        } else {
          appState.transactions = generateSampleTransactions();
        }
        if (parsed.categories) appState.categories = parsed.categories;
        if (parsed.accounts) appState.accounts = parsed.accounts;
        if (parsed.budgets) appState.budgets = parsed.budgets;
        if (parsed.savingsGoals) appState.savingsGoals = parsed.savingsGoals;
        if (parsed.selectedAssetRange) appState.selectedAssetRange = parsed.selectedAssetRange;
        if (parsed.theme) appState.theme = parsed.theme;
      } else {
        appState.transactions = generateSampleTransactions();
        saveStateToStorage();
      }
    } catch (e) {
      console.warn('LocalStorage load fallback:', e);
      appState.transactions = generateSampleTransactions();
    }
  }

  // ==================================================
  // 5. CALCULATIONS & DATA ANALYTICS LOGIC
  // ==================================================

  function getMonthFilter(ymStr) {
    return appState.transactions.filter(t => t.date && t.date.startsWith(ymStr));
  }

  function getMonthSummary(ymStr) {
    const txs = getMonthFilter(ymStr);
    let income = 0;
    let expense = 0;

    txs.forEach(t => {
      if (t.type === 'income') {
        income += Number(t.amount);
      } else if (t.type === 'expense') {
        expense += Number(t.amount);
      }
      // Note: 'transfer' type does NOT affect income or expense! (Double Counting Protected)
    });

    return {
      income,
      expense,
      net: income - expense
    };
  }

  function getCategoryExpenseBreakdown(ymStr) {
    const txs = getMonthFilter(ymStr).filter(t => t.type === 'expense');
    const map = {};

    txs.forEach(t => {
      map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount);
    });

    return map;
  }

  function getTotalsFromAccounts() {
    let totalAssets = 0;
    let totalLiabilities = 0;

    appState.accounts.forEach(acc => {
      const bal = Number(acc.balance);
      if (bal < 0 || acc.type === 'liability') {
        totalLiabilities += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    };
  }

  function getAssetAtDate(dateStr) {
    const totals = getTotalsFromAccounts();
    let asset = totals.totalAssets;

    appState.transactions.forEach(t => {
      if (!t.date || !t.amount) return;
      if (t.date > dateStr) {
        if (t.type === 'income') {
          asset -= Number(t.amount);
        } else if (t.type === 'expense') {
          asset += Number(t.amount);
        }
      }
    });

    return Math.max(0, Math.round(asset));
  }

  function calculateAIPaceForecast() {
    const summary = getMonthSummary(appState.currentYearMonth);
    const overallBudget = appState.budgets.overall;
    
    // Days in current month
    const [y, m] = appState.currentYearMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = new Date();
    const currentDay = (today.getFullYear() === y && (today.getMonth() + 1) === m) ? today.getDate() : 18; // Default 18th

    const dailyPace = summary.expense / Math.max(currentDay, 1);
    const projectedTotal = summary.expense + (dailyPace * (daysInMonth - currentDay));
    const projectedRemaining = overallBudget - projectedTotal;

    return {
      dailyPace: Math.round(dailyPace),
      projectedTotal: Math.round(projectedTotal),
      projectedRemaining: Math.round(projectedRemaining),
      isWithinBudget: projectedTotal <= overallBudget
    };
  }

  function generateAIInsights() {
    const currentYM = appState.currentYearMonth;
    const [curY, curM] = currentYM.split('-').map(Number);
    const prevDate = new Date(curY, curM - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth() + 1;
    const prevYM = `${prevY}-${String(prevM).padStart(2, '0')}`;

    const currentSummary = getMonthSummary(currentYM);
    const prevSummary = getMonthSummary(prevYM);
    const currentCatMap = getCategoryExpenseBreakdown(currentYM);
    const prevCatMap = getCategoryExpenseBreakdown(prevYM);
    const currentTxs = getMonthFilter(currentYM);

    const insights = [];

    // 1. If no transactions in current month
    if (currentTxs.length === 0) {
      insights.push({
        id: 'ai_empty',
        title: '家計データの登録をはじめましょう',
        message: `${curM}月の取引データはまだ登録されていません。画面下部の「＋」ボタンからレシート撮影や手動入力で支出・収入を記録すると、AIがあなたの家計パターンを分析して節約・改善のアドバイスを提案します。`,
        evidence: {
          label: `${curM}月の登録件数`,
          previous_value: getMonthFilter(prevYM).length,
          current_value: 0,
          diff: 0
        }
      });
      insights.push({
        id: 'ai_budget_init',
        title: '今月の予算目標を設定しましょう',
        message: `今月の総予算が ${formatYenPlain(appState.budgets.overall)} に設定されています。「今月の残り予算」カードをタップして、希望の予算額を調整しておくと使いすぎを防げます。`,
        evidence: {
          label: '今月の総予算枠',
          previous_value: appState.budgets.overall,
          current_value: appState.budgets.overall,
          diff: 0
        }
      });
      appState.aiInsights = insights;
      return insights;
    }

    // 2. Budget Pace & Overspend Risk / Healthy Pace
    if (appState.budgets.overall > 0) {
      const forecast = calculateAIPaceForecast();
      const budgetLimit = appState.budgets.overall;
      const daysInMonth = new Date(curY, curM, 0).getDate();
      const today = new Date();
      const currentDay = (today.getFullYear() === curY && (today.getMonth() + 1) === curM) ? today.getDate() : 15;
      const daysRemaining = Math.max(1, daysInMonth - currentDay);
      const remainingBudget = budgetLimit - currentSummary.expense;

      if (!forecast.isWithinBudget) {
        const overAmt = forecast.projectedTotal - budgetLimit;
        const targetDaily = Math.max(0, Math.round(remainingBudget / daysRemaining));
        insights.push({
          id: 'ai_pace_warn',
          title: '月末の予算超過リスク予測',
          message: `現在の支出ペース（1日約${formatYenPlain(forecast.dailyPace)}）を維持すると月末の支出は約${formatYenPlain(forecast.projectedTotal)}となり、総予算（${formatYenPlain(budgetLimit)}）を約${formatYenPlain(overAmt)}超過する見込みです。残り${daysRemaining}日間、1日の支出目安を約${formatYenPlain(targetDaily)}に抑えることで予算内に着地できます。`,
          evidence: {
            label: '月末着地予測額',
            previous_value: budgetLimit,
            current_value: forecast.projectedTotal,
            diff: overAmt
          }
        });
      } else {
        const usedPct = Math.round((currentSummary.expense / budgetLimit) * 100);
        insights.push({
          id: 'ai_pace_good',
          title: '健全な予算消化ペースを維持中',
          message: `今月の予算消化率は${usedPct}%（${formatYenPlain(currentSummary.expense)} / ${formatYenPlain(budgetLimit)}）で推移しています。月末の着地予測は約${formatYenPlain(forecast.projectedTotal)}で、予算枠内にしっかり収まる見込みです。`,
          evidence: {
            label: '今月の総支出進捗',
            previous_value: budgetLimit,
            current_value: currentSummary.expense,
            diff: currentSummary.expense - budgetLimit
          }
        });
      }
    }

    // 3. Category Increase / Decrease MoM
    const allCatIds = Array.from(new Set([...Object.keys(currentCatMap), ...Object.keys(prevCatMap)]));
    let maxIncreaseCat = null;
    let maxIncreaseDiff = 0;
    let maxDecreaseCat = null;
    let maxDecreaseDiff = 0;

    allCatIds.forEach(catId => {
      const cur = currentCatMap[catId] || 0;
      const prev = prevCatMap[catId] || 0;
      const diff = cur - prev;

      if (diff > maxIncreaseDiff && cur > 0) {
        maxIncreaseDiff = diff;
        maxIncreaseCat = { cat: getCategoryById(catId), cur, prev, diff };
      }
      if (diff < maxDecreaseDiff && prev > 0) {
        maxDecreaseDiff = diff;
        maxDecreaseCat = { cat: getCategoryById(catId), cur, prev, diff };
      }
    });

    if (maxIncreaseCat && maxIncreaseDiff >= 2000) {
      insights.push({
        id: 'ai_cat_increase',
        title: `${maxIncreaseCat.cat.name}の支出急増アラート`,
        message: `今月は「${maxIncreaseCat.cat.name}」の支出が先月（${formatYenPlain(maxIncreaseCat.prev)}）より +${formatYenPlain(maxIncreaseCat.diff)} 増加しています（現在 ${formatYenPlain(maxIncreaseCat.cur)}）。まとめ買いや利用頻度の見直しを意識しましょう。`,
        evidence: {
          label: `${maxIncreaseCat.cat.name}支出額`,
          previous_value: maxIncreaseCat.prev,
          current_value: maxIncreaseCat.cur,
          diff: maxIncreaseCat.diff
        }
      });
    }

    if (maxDecreaseCat && Math.abs(maxDecreaseDiff) >= 2000) {
      insights.push({
        id: 'ai_cat_decrease',
        title: `${maxDecreaseCat.cat.name}の節約・削減効果`,
        message: `先月と比べて「${maxDecreaseCat.cat.name}」の支出が ${formatYenPlain(Math.abs(maxDecreaseCat.diff))} 抑制できています（${formatYenPlain(maxDecreaseCat.prev)} → ${formatYenPlain(maxDecreaseCat.cur)}）。節約効果がしっかり出ています！`,
        evidence: {
          label: `${maxDecreaseCat.cat.name}支出額`,
          previous_value: maxDecreaseCat.prev,
          current_value: maxDecreaseCat.cur,
          diff: maxDecreaseCat.diff
        }
      });
    }

    // 4. Fixed vs Variable cost distribution advice
    const expenseTxs = currentTxs.filter(t => t.type === 'expense');
    if (expenseTxs.length > 0) {
      let fixedTotal = 0;
      let variableTotal = 0;
      expenseTxs.forEach(t => {
        const cat = getCategoryById(t.category_id);
        if (cat.fixed) fixedTotal += Number(t.amount);
        else variableTotal += Number(t.amount);
      });

      const totalExp = currentSummary.expense || 1;
      const varPct = Math.round((variableTotal / totalExp) * 100);

      if (varPct >= 65 && variableTotal >= 15000) {
        insights.push({
          id: 'ai_variable_ratio',
          title: '変動費の比率が高めの傾向',
          message: `今月の支出のうち食費・日用品・娯楽などの変動費が約${varPct}%（${formatYenPlain(variableTotal)}）を占めています。日々の細かな出費を意識して控えることで、手軽に余剰資金を作り出せます。`,
          evidence: {
            label: '変動費合計',
            previous_value: fixedTotal,
            current_value: variableTotal,
            diff: variableTotal - fixedTotal
          }
        });
      } else if (fixedTotal >= 40000 && fixedTotal >= variableTotal) {
        insights.push({
          id: 'ai_fixed_ratio',
          title: '固定費の見直しによる余剰創出',
          message: `住居・通信・サブスク等の固定費が支出の多く（${formatYenPlain(fixedTotal)}）を占めています。使っていないサブスクの解約や通信プラン見直しが効果的です。`,
          evidence: {
            label: '固定費合計',
            previous_value: variableTotal,
            current_value: fixedTotal,
            diff: fixedTotal - variableTotal
          }
        });
      }
    }

    // 5. Income & Net Surplus / Deficit Advice
    if (currentSummary.income > 0) {
      if (currentSummary.net > 0) {
        const rate = Math.round((currentSummary.net / currentSummary.income) * 100);
        insights.push({
          id: 'ai_surplus',
          title: `今月の黒字ペース（貯蓄率 ${rate}%）`,
          message: `今月は収入 ${formatYenPlain(currentSummary.income)} に対して支出を ${formatYenPlain(currentSummary.expense)} に抑え、+${formatYenPlain(currentSummary.net)} の黒字を維持しています。余剰分を貯金目標への積立に回すのがおすすめです。`,
          evidence: {
            label: '今月の収支差額（黒字額）',
            previous_value: 0,
            current_value: currentSummary.net,
            diff: currentSummary.net
          }
        });
      } else if (currentSummary.net < 0) {
        insights.push({
          id: 'ai_deficit',
          title: '収支マイナス（赤字）注意',
          message: `今月は支出が収入を ${formatYenPlain(Math.abs(currentSummary.net))} 上回っています（赤字状態）。取引履歴を再確認し、急ぎではない買い物を次月以降に回すことを検討しましょう。`,
          evidence: {
            label: '今月の収支差額（赤字額）',
            previous_value: currentSummary.income,
            current_value: currentSummary.expense,
            diff: currentSummary.expense - currentSummary.income
          }
        });
      }
    }

    const finalInsights = insights.slice(0, 3);
    appState.aiInsights = finalInsights;
    return finalInsights;
  }

  // ==================================================
  // 6. UI RENDER ENGINE
  // ==================================================

  function renderApp() {
    renderHeaderInfo();
    renderHomeView();
    renderTransactionsView();
    renderAnalyticsView();
    renderAssetsView();
    renderMonthlyReportView();
    renderSettingsView();
    applyThemeAndModeClass();
  }

  function applyThemeAndModeClass() {
    document.body.className = `${appState.theme}-theme`;
  }

  function renderHeaderInfo() {
    const [y, m] = appState.currentYearMonth.split('-');
    const labelEl = document.getElementById('current-month-label');
    if (labelEl) labelEl.textContent = `${y}年 ${Number(m)}月`;

    const pickerInput = document.getElementById('header-month-picker-input');
    if (pickerInput) pickerInput.value = appState.currentYearMonth;
  }

  // LEVEL 1 / 2 / 3 HOME DASHBOARD RENDERER
  function renderHomeView() {
    const summary = getMonthSummary(appState.currentYearMonth);
    const accountTotals = getTotalsFromAccounts();
    const budgetLimit = appState.budgets.overall;
    const remBudget = budgetLimit - summary.expense;
    const budgetPercent = Math.min(Math.round((summary.expense / budgetLimit) * 100), 100);

    const netBalEl = document.getElementById('home-net-balance');
    if (netBalEl) netBalEl.textContent = formatYen(summary.net);

    // MoM Balance Comparison
    const [curY, curM] = appState.currentYearMonth.split('-').map(Number);
    const prevDate = new Date(curY, curM - 2, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevSummary = getMonthSummary(prevYM);
    const momDiff = summary.net - prevSummary.net;
    const momDiffEl = document.getElementById('home-mom-diff');
    if (momDiffEl) {
      const isPositive = momDiff >= 0;
      momDiffEl.className = `hero-sub-comparison ${isPositive ? 'positive' : 'negative'}`;
      momDiffEl.innerHTML = `
        <span class="material-symbols-rounded">${isPositive ? 'trending_up' : 'trending_down'}</span>
        <span>前月比 ${formatYen(momDiff)}</span>
      `;
    }

    const totAssetsEl = document.getElementById('home-total-assets');
    if (totAssetsEl) totAssetsEl.textContent = formatYenPlain(accountTotals.totalAssets);

    const netAssetsEl = document.getElementById('home-net-assets');
    if (netAssetsEl) netAssetsEl.textContent = `純資産: ${formatYenPlain(accountTotals.netWorth)}`;

    const remBudgetEl = document.getElementById('home-remaining-budget');
    if (remBudgetEl) remBudgetEl.textContent = formatYenPlain(remBudget);

    const budgetProgEl = document.getElementById('home-budget-progress-text');
    if (budgetProgEl) budgetProgEl.textContent = `予算 ${formatYenPlain(budgetLimit)} 中 ${budgetPercent}% 使用`;

    const budgetGaugeEl = document.getElementById('home-budget-gauge-fill');
    if (budgetGaugeEl) budgetGaugeEl.style.width = `${budgetPercent}%`;

    const totIncomeEl = document.getElementById('home-total-income');
    if (totIncomeEl) totIncomeEl.textContent = formatYenPlain(summary.income);

    const totExpenseEl = document.getElementById('home-total-expense');
    if (totExpenseEl) totExpenseEl.textContent = formatYenPlain(summary.expense);

    const forecast = calculateAIPaceForecast();
    const forecastDescEl = document.getElementById('home-forecast-desc');
    if (forecastDescEl) {
      forecastDescEl.innerHTML = `
        現在の支出速度（1日平均 <strong>${formatYenPlain(forecast.dailyPace)}</strong>）を維持した場合、月末の予想支出は約 <strong>${formatYenPlain(forecast.projectedTotal)}</strong> となり、${forecast.isWithinBudget ? '予算内に収まる見込みです。' : '予算を超過する可能性があります。'}
      `;
    }

    // Primary Savings Goal
    const primaryGoal = appState.savingsGoals.find(g => g.is_primary) || appState.savingsGoals[0];
    if (primaryGoal) {
      const pPercent = Math.round((primaryGoal.current_amount / primaryGoal.target_amount) * 100);
      const goalTitleEl = document.getElementById('home-goal-title');
      const goalDateEl = document.getElementById('home-goal-date');
      const goalPercentEl = document.getElementById('home-goal-percent');
      const goalBarEl = document.getElementById('home-goal-bar-fill');
      const goalCurrEl = document.getElementById('home-goal-current');

      if (goalTitleEl) goalTitleEl.textContent = primaryGoal.title;
      if (goalDateEl) goalDateEl.textContent = `目標: ${primaryGoal.target_date || '未設定'}`;
      if (goalPercentEl) goalPercentEl.textContent = `${pPercent}%`;
      if (goalBarEl) goalBarEl.style.width = `${pPercent}%`;
      if (goalCurrEl) goalCurrEl.textContent = `現在: ${formatYenPlain(primaryGoal.current_amount)} / ${formatYenPlain(primaryGoal.target_amount)}`;
    }

    // LEVEL 3: AI Insights Cards
    const insights = generateAIInsights();
    const insightsContainer = document.getElementById('home-ai-insights-container');
    if (insightsContainer) {
      insightsContainer.innerHTML = insights.map(item => `
        <div class="ai-insight-card" data-id="${item.id}">
          <div class="ai-card-title"><span class="material-symbols-rounded">auto_awesome</span> ${item.title}</div>
          <div class="ai-card-text">${item.message}</div>
        </div>
      `).join('');

      insightsContainer.querySelectorAll('.ai-insight-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-id');
          const target = appState.aiInsights.find(i => i.id === id);
          if (target) openAIEvidenceModal(target);
        });
      });
    }

    // LEVEL 3: Recent Transactions
    const recent = getMonthFilter(appState.currentYearMonth).slice(0, 5);
    const recentListEl = document.getElementById('home-recent-tx-list');
    if (recentListEl) renderTransactionItemList(recent, recentListEl);
  }

  // TRANSACTIONS VIEW RENDERER
  function renderTransactionsView() {
    const summary = getMonthSummary(appState.currentYearMonth);
    const incEl = document.getElementById('tx-summary-income');
    const expEl = document.getElementById('tx-summary-expense');
    const netEl = document.getElementById('tx-summary-net');
    if (incEl) incEl.textContent = `収入: ${formatYenPlain(summary.income)}`;
    if (expEl) expEl.textContent = `支出: ${formatYenPlain(summary.expense)}`;
    if (netEl) netEl.textContent = `収支: ${formatYen(summary.net)}`;

    // Populate Filters
    const catSelect = document.getElementById('filter-category-select');
    const accSelect = document.getElementById('filter-account-select');
    const typeSelect = document.getElementById('filter-type-select');
    const searchInput = document.getElementById('tx-search-input');

    if (catSelect) {
      const prevVal = catSelect.value || 'ALL';
      catSelect.innerHTML = '<option value="ALL">全てのカテゴリ</option>' + 
        appState.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (prevVal) catSelect.value = prevVal;
    }

    if (accSelect) {
      const prevVal = accSelect.value || 'ALL';
      accSelect.innerHTML = '<option value="ALL">全ての口座</option>' + 
        appState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      if (prevVal) accSelect.value = prevVal;
    }

    // Filter Transactions List
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const catFilter = catSelect ? catSelect.value : 'ALL';
    const typeFilter = typeSelect ? typeSelect.value : 'ALL';
    const accFilter = accSelect ? accSelect.value : 'ALL';

    let filtered = getMonthFilter(appState.currentYearMonth);

    if (searchVal) {
      filtered = filtered.filter(t => 
        (t.merchant && t.merchant.toLowerCase().includes(searchVal)) ||
        (t.memo && t.memo.toLowerCase().includes(searchVal)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchVal))) ||
        (String(t.amount).includes(searchVal))
      );
    }

    if (catFilter !== 'ALL') filtered = filtered.filter(t => t.category_id === catFilter);
    if (typeFilter !== 'ALL') filtered = filtered.filter(t => t.type === typeFilter);
    if (accFilter !== 'ALL') filtered = filtered.filter(t => t.account_id === accFilter || t.to_account_id === accFilter);

    const fullListEl = document.getElementById('tx-full-list');
    if (fullListEl) renderTransactionGroupedList(filtered, fullListEl);
    renderCalendarGrid();
  }

  function renderTransactionItemList(txList, containerEl) {
    if (!txList || txList.length === 0) {
      containerEl.innerHTML = '<div class="empty-placeholder">取引明細はありません</div>';
      return;
    }

    containerEl.innerHTML = txList.map(t => {
      const cat = getCategoryById(t.category_id);
      const acc = getAccountById(t.account_id);
      const amountClass = t.type;
      const sign = t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '⇄ ');

      return `
        <div class="tx-item-row" data-id="${t.id}">
          <div class="tx-item-left">
            <div class="tx-cat-icon" style="background:${cat.color}22; color:${cat.color}">
              <span class="material-symbols-rounded">${cat.icon}</span>
            </div>
            <div class="tx-item-details">
              <span class="tx-merchant-name">${t.merchant || cat.name}</span>
              <span class="tx-sub-info">${t.date} · ${acc.name} ${t.memo ? '· ' + t.memo : ''}</span>
            </div>
          </div>
          <div class="tx-item-right">
            <div class="tx-amount ${amountClass}">${sign}${formatYenPlain(t.amount)}</div>
            <div class="tx-actions-mini">
              <button class="tx-mini-btn delete-tx" data-id="${t.id}" title="削除"><span class="material-symbols-rounded">delete</span></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Delete Actions
    containerEl.querySelectorAll('.delete-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteTransaction(id);
      });
    });
  }

  function renderTransactionGroupedList(txList, containerEl) {
    if (!txList || txList.length === 0) {
      containerEl.innerHTML = '<div class="empty-placeholder">条件に合う取引データが見つかりませんでした</div>';
      return;
    }

    // Group by Date
    const grouped = {};
    txList.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    containerEl.innerHTML = dates.map(date => {
      const items = grouped[date];
      let dayExpense = 0;
      let dayIncome = 0;
      items.forEach(i => {
        if (i.type === 'expense') dayExpense += Number(i.amount);
        if (i.type === 'income') dayIncome += Number(i.amount);
      });

      return `
        <div class="tx-date-group">
          <div class="tx-date-header" style="display:flex; justify-content:space-between; padding:8px 4px; font-size:12px; color:var(--text-secondary); font-weight:700;">
            <span>${date}</span>
            <span>${dayIncome > 0 ? '収入 ' + formatYenPlain(dayIncome) + '  ' : ''}支出 ${formatYenPlain(dayExpense)}</span>
          </div>
          <div class="transaction-items-list">
            ${items.map(t => {
              const cat = getCategoryById(t.category_id);
              const acc = getAccountById(t.account_id);
              const sign = t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '⇄ ');
              return `
                <div class="tx-item-row" data-id="${t.id}">
                  <div class="tx-item-left">
                    <div class="tx-cat-icon" style="background:${cat.color}22; color:${cat.color}">
                      <span class="material-symbols-rounded">${cat.icon}</span>
                    </div>
                    <div class="tx-item-details">
                      <span class="tx-merchant-name">${t.merchant || cat.name}</span>
                      <span class="tx-sub-info">${acc.name} ${t.memo ? '· ' + t.memo : ''}</span>
                    </div>
                  </div>
                  <div class="tx-item-right">
                    <div class="tx-amount ${t.type}">${sign}${formatYenPlain(t.amount)}</div>
                    <div class="tx-actions-mini">
                      <button class="tx-mini-btn delete-tx" data-id="${t.id}"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    containerEl.querySelectorAll('.delete-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteTransaction(id);
      });
    });
  }

  // CALENDAR RENDERER
  function renderCalendarGrid() {
    const [y, m] = appState.currentYearMonth.split('-').map(Number);
    document.getElementById('cal-month-title').textContent = `${y}年 ${m}月`;

    const firstDayIndex = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthTxs = getMonthFilter(appState.currentYearMonth);

    // Map daily totals
    const dailyMap = {};
    monthTxs.forEach(t => {
      const dayNum = Number(t.date.split('-')[2]);
      if (!dailyMap[dayNum]) dailyMap[dayNum] = { expense: 0, income: 0, items: [] };
      if (t.type === 'expense') dailyMap[dayNum].expense += Number(t.amount);
      if (t.type === 'income') dailyMap[dayNum].income += Number(t.amount);
      dailyMap[dayNum].items.push(t);
    });

    const matrixEl = document.getElementById('calendar-days-matrix');
    let html = '';

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      html += '<div class="cal-day-cell empty"></div>';
    }

    const todayStr = getTodayStr();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = dailyMap[day] || { expense: 0, income: 0, items: [] };
      const isToday = dateStr === todayStr;

      html += `
        <div class="cal-day-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <span class="cal-day-num">${day}</span>
          <div>
            ${data.income > 0 ? `<div class="cal-day-amount income">+${Math.round(data.income/1000)}k</div>` : ''}
            ${data.expense > 0 ? `<div class="cal-day-amount expense">-${Math.round(data.expense/1000)}k</div>` : ''}
          </div>
        </div>
      `;
    }

    matrixEl.innerHTML = html;

    // Attach Cell Click Event
    matrixEl.querySelectorAll('.cal-day-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', () => {
        matrixEl.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        const targetDate = cell.getAttribute('data-date');
        renderSelectedDayCalendarDetails(targetDate);
      });
    });
  }

  function renderSelectedDayCalendarDetails(dateStr) {
    document.getElementById('cal-selected-date-label').textContent = `${dateStr} の明細`;
    const items = appState.transactions.filter(t => t.date === dateStr);
    let dayTotal = 0;
    items.forEach(i => { if (i.type === 'expense') dayTotal += Number(i.amount); });
    document.getElementById('cal-selected-day-total').textContent = `支出合計: ${formatYenPlain(dayTotal)}`;

    renderTransactionItemList(items, document.getElementById('cal-selected-day-list'));
  }

  // ANALYTICS VIEW & CHARTS RENDERER
  function renderAnalyticsView() {
    const summary = getMonthSummary(appState.currentYearMonth);
    document.getElementById('analytics-pie-total').textContent = `総支出: ${formatYenPlain(summary.expense)}`;

    renderCategoryDonutChart();
    renderMonthlyBarChart();
    renderFixedVsVariableBreakdown();
    renderBudgetProgress();
    renderMoMList();
  }

  function renderOfflineDonutCanvas(canvasEl, data, colors) {
    if (!canvasEl || !canvasEl.getContext) return;
    const c = canvasEl.getContext('2d');
    const w = canvasEl.width = 220;
    const h = canvasEl.height = 220;
    c.clearRect(0, 0, w, h);

    const total = data.reduce((a, b) => a + b, 0) || 1;
    let startAngle = -Math.PI / 2;
    const centerX = w / 2;
    const centerY = h / 2;
    const outerRadius = 95;
    const innerRadius = 60;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      c.beginPath();
      c.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
      c.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      c.closePath();
      c.fillStyle = colors[i] || '#4338CA';
      c.fill();
      startAngle += sliceAngle;
    });
  }

  function renderCategoryDonutChart() {
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx) return;

    const breakdown = getCategoryExpenseBreakdown(appState.currentYearMonth);
    const sortedCatIds = Object.keys(breakdown).sort((a, b) => breakdown[b] - breakdown[a]);
    const totalExpense = sortedCatIds.reduce((sum, id) => sum + breakdown[id], 0);

    const labels = [];
    const data = [];
    const colors = [];

    sortedCatIds.forEach(catId => {
      const cat = getCategoryById(catId);
      labels.push(cat.name);
      data.push(breakdown[catId]);
      colors.push(cat.color);
    });

    // Render Custom Fixed-Position 2-Column Legend below chart
    const legendContainer = document.getElementById('category-donut-legend');
    if (legendContainer) {
      if (sortedCatIds.length === 0) {
        legendContainer.innerHTML = '<div style="text-align:center; font-size:12px; color:var(--text-muted); padding:12px 8px;">今月の支出データはありません</div>';
      } else {
        legendContainer.innerHTML = sortedCatIds.map(catId => {
          const cat = getCategoryById(catId);
          const amt = breakdown[catId];
          const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
          return `
            <div class="donut-legend-item">
              <div class="donut-legend-left">
                <span class="donut-legend-dot" style="background-color: ${cat.color};"></span>
                <span class="donut-legend-name">${cat.name}</span>
              </div>
              <span class="donut-legend-amount">${formatYenPlain(amt)} (${pct}%)</span>
            </div>
          `;
        }).join('');
      }
    }

    if (typeof Chart === 'undefined') {
      renderOfflineDonutCanvas(ctx, data.length ? data : [1], colors.length ? colors : ['#4338CA']);
      return;
    }

    if (charts.donut) charts.donut.destroy();

    charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['支出なし'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors.length ? colors : ['#4338CA'],
          borderWidth: 2,
          borderColor: appState.theme === 'dark' ? '#1E2432' : '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Use custom HTML legend so chart size remains large and constant!
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                return ` ${context.label}: ¥${Number(val).toLocaleString('ja-JP')} (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  function renderMonthlyBarChart() {
    const ctx = document.getElementById('monthlyBarChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const [selY, selM] = appState.currentYearMonth.split('-').map(Number);

    // Dynamically generate past 6 months ending at currentYearMonth
    const months = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selY, selM - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ymStr = `${y}-${String(m).padStart(2, '0')}`;
      months.push(ymStr);
      labels.push(`${m}月`);
    }

    const incomeData = months.map(m => getMonthSummary(m).income);
    const expenseData = months.map(m => getMonthSummary(m).expense);

    if (charts.bar) charts.bar.destroy();

    const isDark = appState.theme === 'dark';
    const textColor = isDark ? '#9AA2B1' : '#6C757D';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '収入',
            data: incomeData,
            backgroundColor: 'hsl(158, 64%, 52%)',
            borderRadius: 6,
            maxBarThickness: 32
          },
          {
            label: '支出',
            data: expenseData,
            backgroundColor: 'hsl(347, 89%, 60%)',
            borderRadius: 6,
            maxBarThickness: 32
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${formatYenPlain(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => formatYenPlain(val)
            }
          }
        }
      }
    });
  }

  function renderFixedVsVariableBreakdown() {
    const monthTxs = getMonthFilter(appState.currentYearMonth).filter(t => t.type === 'expense');
    let fixedTotal = 0;
    let variableTotal = 0;

    const fixedList = [];
    const variableList = [];

    monthTxs.forEach(t => {
      const cat = getCategoryById(t.category_id);
      if (cat.fixed) {
        fixedTotal += Number(t.amount);
        fixedList.push(t);
      } else {
        variableTotal += Number(t.amount);
        variableList.push(t);
      }
    });

    const fixedTotEl = document.getElementById('fixed-expense-total');
    const varTotEl = document.getElementById('variable-expense-total');
    if (fixedTotEl) fixedTotEl.textContent = formatYenPlain(fixedTotal);
    if (varTotEl) varTotEl.textContent = formatYenPlain(variableTotal);

    const fixedListEl = document.getElementById('fixed-expense-list');
    const varListEl = document.getElementById('variable-expense-list');
    if (fixedListEl) renderTransactionItemList(fixedList, fixedListEl);
    if (varListEl) renderTransactionItemList(variableList, varListEl);
  }

  function renderBudgetProgress() {
    const summary = getMonthSummary(appState.currentYearMonth);
    const overallLimit = appState.budgets.overall;
    const overallPercent = Math.min(Math.round((summary.expense / overallLimit) * 100), 100);

    const percEl = document.getElementById('budget-overall-percent');
    const fillEl = document.getElementById('budget-overall-fill');
    const usedEl = document.getElementById('budget-overall-used');
    const limitEl = document.getElementById('budget-overall-limit');
    const remEl = document.getElementById('budget-overall-rem');

    if (percEl) percEl.textContent = `${overallPercent}%`;
    if (fillEl) fillEl.style.width = `${overallPercent}%`;
    if (usedEl) usedEl.textContent = `使用額: ${formatYenPlain(summary.expense)}`;
    if (limitEl) limitEl.textContent = `予算上限: ${formatYenPlain(overallLimit)}`;
    if (remEl) remEl.textContent = `残り: ${formatYenPlain(overallLimit - summary.expense)}`;

    // Category Budgets List
    const catBreakdown = getCategoryExpenseBreakdown(appState.currentYearMonth);
    const container = document.getElementById('category-budgets-container');
    if (container) {
      container.innerHTML = Object.keys(appState.budgets.categories).map(catId => {
        const cat = getCategoryById(catId);
        const limit = appState.budgets.categories[catId];
        const used = catBreakdown[catId] || 0;
        const percent = Math.min(Math.round((used / limit) * 100), 100);

        return `
          <div class="cat-budget-row" style="background:var(--surface-2); padding:12px; border-radius:var(--radius-sm); margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:44px;">
                <span class="material-symbols-rounded" style="color:${cat.color}; font-size:20px;">${cat.icon}</span>
                <span style="font-size:10px; font-weight:600; color:var(--text-secondary); writing-mode:horizontal-tb; text-align:center; white-space:nowrap;">${cat.name}</span>
              </div>
              <span style="font-size:12px; font-weight:700;">${formatYenPlain(used)} / ${formatYenPlain(limit)} (${percent}%)</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${percent}%; background:${cat.color}"></div></div>
          </div>
        `;
      }).join('');
    }
  }

  function renderMoMList() {
    const currentYM = appState.currentYearMonth;
    const [y, m] = currentYM.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const curBreakdown = getCategoryExpenseBreakdown(currentYM);
    const prevBreakdown = getCategoryExpenseBreakdown(prevYM);
    const container = document.getElementById('mom-category-list');
    if (!container) return;

    const allCatIds = Array.from(new Set([...Object.keys(curBreakdown), ...Object.keys(prevBreakdown)]));

    container.innerHTML = allCatIds.map(catId => {
      const cat = getCategoryById(catId);
      const valCur = curBreakdown[catId] || 0;
      const valPrev = prevBreakdown[catId] || 0;
      const diff = valCur - valPrev;
      const badgeClass = diff > 0 ? 'up' : 'down';
      const sign = diff > 0 ? '+' : '';

      return `
        <div class="mom-row">
          <div class="mom-cat-info" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:44px;">
            <span class="material-symbols-rounded" style="color:${cat.color}; font-size:20px;">${cat.icon}</span>
            <span style="font-size:10px; font-weight:600; color:var(--text-secondary); writing-mode:horizontal-tb; text-align:center; white-space:nowrap;">${cat.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:11px; color:var(--text-secondary);">先月: ${formatYenPlain(valPrev)} ➔ 今月: ${formatYenPlain(valCur)}</span>
            <span class="mom-diff-badge ${badgeClass}">${sign}${formatYenPlain(diff)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ASSETS VIEW RENDERER
  function renderAssetsView() {
    const totals = getTotalsFromAccounts();
    const totValEl = document.getElementById('assets-total-val');
    const liabValEl = document.getElementById('assets-liability-val');
    const netValEl = document.getElementById('assets-net-val');

    if (totValEl) totValEl.textContent = formatYenPlain(totals.totalAssets);
    if (liabValEl) liabValEl.textContent = formatYenPlain(totals.totalLiabilities);
    if (netValEl) netValEl.textContent = formatYenPlain(totals.netWorth);

    renderAssetTrendChart();

    // Account Cards
    const accContainer = document.getElementById('accounts-grid-container');
    if (accContainer) {
      accContainer.innerHTML = appState.accounts.map(acc => `
        <div class="account-card-item">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-symbols-rounded" style="color:var(--accent-primary)">${acc.icon}</span>
            <div>
              <div style="font-weight:700; font-size:14px;">${acc.name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${acc.is_mock_sync ? 'API同期済み' : '手動管理'}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="font-size:15px; font-weight:800; color:${acc.balance < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}">
              ${formatYenPlain(acc.balance)}
            </div>
            ${!['acc_cash', 'acc_mufg'].includes(acc.id) ? `<button class="account-delete-btn icon-btn" data-id="${acc.id}" title="口座削除" style="width:28px; height:28px; border:none; background:none; color:var(--color-expense); cursor:pointer;"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>` : ''}
          </div>
        </div>
      `).join('');
    }

    // Savings Goals
    const goalContainer = document.getElementById('savings-goals-container');
    if (goalContainer) {
      goalContainer.innerHTML = appState.savingsGoals.map(g => {
        const p = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
        return `
          <div class="savings-goal-card" style="margin-bottom:10px; position:relative;">
            <div class="goal-card-head">
              <div class="goal-title-group">
                <span class="material-symbols-rounded goal-icon">${g.icon}</span>
                <div>
                  <span class="goal-name">${g.title}</span>
                  <span class="goal-target-date">目標: ${g.target_date || '未設定'}</span>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="goal-percent-badge">${p}%</span>
                <button class="goal-delete-btn icon-btn" data-id="${g.id}" title="目標を削除" style="width:28px; height:28px; border:none; background:none; color:var(--color-expense); cursor:pointer;"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>
              </div>
            </div>
            <div class="goal-progress-bar-bg"><div class="goal-progress-bar-fill" style="width:${p}%"></div></div>
            <div class="goal-card-foot">
              <span>現在: ${formatYenPlain(g.current_amount)} / ${formatYenPlain(g.target_amount)}</span>
              <span class="goal-est-text">${p >= 100 ? '達成！' : '進捗順調'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    setupAssetsActionEvents();
  }

  function setupAssetsActionEvents() {
    // Add Account Event Listener
    const addAccBtn = document.getElementById('add-account-btn');
    if (addAccBtn && !addAccBtn.dataset.bound) {
      addAccBtn.dataset.bound = 'true';
      addAccBtn.addEventListener('click', () => {
        const name = prompt('口座・資産の名称を入力してください:\n(例: PayPay, 楽天銀行, SBI証券)');
        if (!name || !name.trim()) return;

        const balanceStr = prompt('現在の残高・評価額を入力してください (半角数字):', '0');
        if (balanceStr === null) return;
        const balance = Number(balanceStr) || 0;

        let icon = 'account_balance';
        if (name.includes('Pay') || name.includes('電子') || name.includes('現金') || name.includes('財布')) {
          icon = 'account_balance_wallet';
        } else if (name.includes('カード') || name.includes('Card')) {
          icon = 'credit_card';
        } else if (name.includes('証券') || name.includes('株') || name.includes('NISA')) {
          icon = 'show_chart';
        }

        const newAcc = {
          id: 'acc_' + Date.now(),
          name: name.trim(),
          type: 'bank',
          balance: balance,
          icon: icon
        };

        appState.accounts.push(newAcc);
        saveStateToStorage();
        renderApp();
        showToast(`口座「${newAcc.name}」を追加しました`);
      });
    }

    // Add Goal Event Listener
    const createGoalBtn = document.getElementById('create-goal-btn');
    if (createGoalBtn && !createGoalBtn.dataset.bound) {
      createGoalBtn.dataset.bound = 'true';
      createGoalBtn.addEventListener('click', () => {
        const title = prompt('貯金目標の名称を入力してください:\n(例: 海外旅行, 新車購入, マイホーム頭金)');
        if (!title || !title.trim()) return;

        const targetStr = prompt('目標金額を入力してください (半角数字):', '500000');
        if (targetStr === null) return;
        const targetAmount = Number(targetStr) || 100000;

        const currentStr = prompt('現在の積立金額を入力してください (半角数字):', '0');
        if (currentStr === null) return;
        const currentAmount = Number(currentStr) || 0;

        const dateStr = prompt('目標期日を入力してください (例: 2027年12月):', '2027年12月');
        const targetDate = dateStr ? dateStr.trim() : '2027年12月';

        const newGoal = {
          id: 'goal_' + Date.now(),
          title: title.trim(),
          target_amount: targetAmount,
          current_amount: currentAmount,
          target_date: targetDate,
          icon: 'savings',
          color: 'hsl(238, 83%, 52%)'
        };

        appState.savingsGoals.push(newGoal);
        saveStateToStorage();
        renderApp();
        showToast(`貯金目標「${newGoal.title}」を作成しました`);
      });
    }

    // Goal Delete Listeners
    document.querySelectorAll('.goal-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const goalId = btn.getAttribute('data-id');
        const goal = appState.savingsGoals.find(g => g.id === goalId);
        if (goal && confirm(`貯金目標「${goal.title}」を削除しますか？`)) {
          appState.savingsGoals = appState.savingsGoals.filter(g => g.id !== goalId);
          saveStateToStorage();
          renderApp();
          showToast('貯金目標を削除しました');
        }
      });
    });

    // Account Delete Listeners
    document.querySelectorAll('.account-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const accId = btn.getAttribute('data-id');
        const acc = appState.accounts.find(a => a.id === accId);
        if (acc && confirm(`口座「${acc.name}」を削除しますか？`)) {
          appState.accounts = appState.accounts.filter(a => a.id !== accId);
          saveStateToStorage();
          renderApp();
          showToast('口座を削除しました');
        }
      });
    });
  }

  function renderAssetTrendChart(range) {
    const ctx = document.getElementById('assetTrendChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const currentRange = range || appState.selectedAssetRange || '1M';
    appState.selectedAssetRange = currentRange;

    // Highlight active chip
    document.querySelectorAll('.time-range-chips .range-chip').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-range') === currentRange);
    });

    const [selectedYear, selectedMonth] = appState.currentYearMonth.split('-').map(Number);

    let labels = [];
    let data = [];

    if (currentRange === '1M') {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const checkpoints = [1, 5, 10, 15, 20, 25, daysInMonth];
      const uniqueDays = [...new Set(checkpoints.map(d => Math.min(d, daysInMonth)))].sort((a, b) => a - b);

      uniqueDays.forEach(day => {
        const dStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        labels.push(`${selectedMonth}/${day}`);
        data.push(getAssetAtDate(dStr));
      });
    } else if (currentRange === '6M') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const lastDay = new Date(y, m, 0).getDate();
        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        labels.push(`${m}月`);
        data.push(getAssetAtDate(dStr));
      }
    } else if (currentRange === '1Y') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const lastDay = new Date(y, m, 0).getDate();
        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        labels.push(`${String(y).slice(2)}/${m}`);
        data.push(getAssetAtDate(dStr));
      }
    }

    if (charts.trend) charts.trend.destroy();

    const isDark = appState.theme === 'dark';
    const textColor = isDark ? '#9AA2B1' : '#6C757D';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '総資産推移',
          data: data,
          borderColor: 'hsl(238, 83%, 52%)',
          backgroundColor: 'rgba(67, 56, 202, 0.15)',
          borderWidth: 2.5,
          pointBackgroundColor: 'hsl(238, 83%, 52%)',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => ` 総資産: ${formatYenPlain(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              callback: (val) => formatYenPlain(val)
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  function renderMonthlyReportView() {
    const summary = getMonthSummary(appState.currentYearMonth);
    document.getElementById('rep-income').textContent = formatYenPlain(summary.income);
    document.getElementById('rep-expense').textContent = formatYenPlain(summary.expense);
    document.getElementById('rep-savings').textContent = formatYenPlain(summary.net);
    const rate = summary.income > 0 ? ((summary.net / summary.income) * 100).toFixed(1) : '0';
    document.getElementById('rep-savings-rate').textContent = `${rate}%`;

    // Top 3 Expense Categories
    const breakdown = getCategoryExpenseBreakdown(appState.currentYearMonth);
    const sortedCatIds = Object.keys(breakdown).sort((a, b) => breakdown[b] - breakdown[a]).slice(0, 3);

    document.getElementById('rep-top-categories').innerHTML = sortedCatIds.map((catId, idx) => {
      const cat = getCategoryById(catId);
      return `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
          <span><strong>NO.${idx + 1} ${cat.name}</strong></span>
          <span style="font-weight:700; color:var(--color-expense)">${formatYenPlain(breakdown[catId])}</span>
        </div>
      `;
    }).join('');
  }

  function renderSettingsView() {
    const themeSel = document.getElementById('setting-theme-select');
    if (themeSel) themeSel.value = appState.theme;
  }

  // ==================================================
  // 7. INTERACTION CONTROLLERS & EVENT LISTENERS
  // ==================================================

  function setupEventListeners() {
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    const bindEvent = (id, eventName, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(eventName, fn);
    };

    // Navigation Tabs
    document.querySelectorAll('.bottom-nav-bar .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    bindClick('hero-quick-input-btn', openInputModal);
    bindClick('fab-input-btn', openInputModal);
    bindClick('close-input-modal-btn', closeInputModal);
    bindClick('close-ai-modal-btn', closeAIEvidenceModal);

    // Global Month Picker & Calendar Modal Trigger
    bindClick('prev-month-btn', () => changeMonth(-1));
    bindClick('next-month-btn', () => changeMonth(1));
    bindClick('current-month-clickable', openMonthCalendarModal);
    bindClick('close-month-modal-btn', closeMonthCalendarModal);
    bindClick('cal-modal-prev-year-btn', () => {
      modalSelectedYear--;
      renderMonthCalendarModal();
    });
    bindClick('cal-modal-next-year-btn', () => {
      modalSelectedYear++;
      renderMonthCalendarModal();
    });
    bindClick('cal-modal-today-btn', () => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      appState.currentYearMonth = `${y}-${m}`;
      closeMonthCalendarModal();
      renderApp();
      showToast(`${y}年 ${Number(m)}月に切り替えました`);
    });

    // Theme Toggle
    bindClick('theme-toggle-btn', toggleTheme);

    // Input Modal Mode Tabs
    bindClick('input-tab-manual', () => switchInputTab('manual'));
    bindClick('input-tab-receipt', () => switchInputTab('receipt'));
    bindClick('input-tab-ai', () => switchInputTab('ai'));

    // Input Modal Keypad & Submits
    setupKeypadEvents();
    setupTypeSelectorEvents();

    // Transactions Search & Filters
    bindEvent('tx-search-input', 'input', renderTransactionsView);
    bindEvent('filter-category-select', 'change', renderTransactionsView);
    bindEvent('filter-type-select', 'change', renderTransactionsView);
    bindEvent('filter-account-select', 'change', renderTransactionsView);

    bindClick('filter-reset-btn', () => {
      const sInput = document.getElementById('tx-search-input');
      const catSel = document.getElementById('filter-category-select');
      const typeSel = document.getElementById('filter-type-select');
      const accSel = document.getElementById('filter-account-select');
      if (sInput) sInput.value = '';
      if (catSel) catSel.value = 'ALL';
      if (typeSel) typeSel.value = 'ALL';
      if (accSel) accSel.value = 'ALL';
      renderTransactionsView();
    });

    // Transactions View Toggle
    bindClick('tx-view-list-btn', () => {
      const listBtn = document.getElementById('tx-view-list-btn');
      const calBtn = document.getElementById('tx-view-cal-btn');
      const listContainer = document.getElementById('tx-list-container');
      const calContainer = document.getElementById('tx-calendar-container');
      if (listBtn) listBtn.classList.add('active');
      if (calBtn) calBtn.classList.remove('active');
      if (listContainer) listContainer.classList.remove('hidden');
      if (calContainer) calContainer.classList.add('hidden');
    });

    bindClick('tx-view-cal-btn', () => {
      const listBtn = document.getElementById('tx-view-list-btn');
      const calBtn = document.getElementById('tx-view-cal-btn');
      const listContainer = document.getElementById('tx-list-container');
      const calContainer = document.getElementById('tx-calendar-container');
      if (calBtn) calBtn.classList.add('active');
      if (listBtn) listBtn.classList.remove('active');
      if (calContainer) calContainer.classList.remove('hidden');
      if (listContainer) listContainer.classList.add('hidden');
    });

    // Analytics Sub Tabs
    setupAnalyticsTabEvents();

    // Budget Edit Modal Triggers
    bindClick('card-budget-status', openBudgetEditModal);
    bindClick('open-edit-budget-btn', openBudgetEditModal);
    bindClick('close-budget-modal-btn', closeBudgetEditModal);
    bindClick('save-budget-settings-btn', saveBudgetSettings);

    // Asset Edit Modal Triggers
    bindClick('card-total-assets', openAssetEditModal);
    bindClick('assets-total-val', openAssetEditModal);
    bindClick('close-asset-modal-btn', closeAssetEditModal);
    bindClick('save-asset-settings-btn', saveAssetSettings);

    // OCR & AI Input Listeners
    setupOCRListeners();
    setupAIListeners();

    // Assets Action Listeners (Add Account, Add Goal, Range Chips)
    setupAssetsActionEvents();
    document.querySelectorAll('.time-range-chips .range-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = btn.getAttribute('data-range') || '1M';
        appState.selectedAssetRange = range;
        renderAssetTrendChart(range);
      });
    });

    // Settings Listeners
    bindEvent('setting-theme-select', 'change', (e) => {
      appState.theme = e.target.value;
      saveStateToStorage();
      renderApp();
    });

    bindClick('export-csv-btn', exportToCSV);
    bindClick('load-sample-data-btn', () => {
      appState.transactions = generateSampleTransactions();
      saveStateToStorage();
      renderApp();
      showToast('サンプルデータをロードしました');
    });

    bindClick('reset-all-data-btn', () => {
      if (confirm('すべてのデータを初期化してもよろしいですか？\n（取引履歴・口座残高・目標がリセットされます）')) {
        appState.transactions = [];
        if (Array.isArray(appState.accounts)) {
          appState.accounts.forEach(acc => acc.balance = 0);
        }
        appState.savingsGoals = [];
        appState.deletedTransactionStack = [];
        saveStateToStorage();
        renderApp();
        showToast('すべてのデータを初期化しました');
      }
    });

    bindClick('home-view-all-tx-btn', () => switchTab('tab-transactions'));
    bindClick('settings-trigger-btn', () => switchTab('tab-settings'));
  }

  function switchTab(tabId) {
    appState.activeTab = tabId;
    if (tabId === 'tab-home') {
      appState.currentYearMonth = getCurrentYearMonthStr();
    }
    document.querySelectorAll('.main-workspace .view-page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.bottom-nav-bar .nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    renderApp();
  }

  function changeMonth(delta) {
    const [y, m] = appState.currentYearMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    appState.currentYearMonth = `${ny}-${nm}`;
    renderApp();
  }

  function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    saveStateToStorage();
    renderApp();
  }

  // Month / Year Calendar Picker Modal Controllers
  let modalSelectedYear = 2026;

  function openMonthCalendarModal() {
    const [y] = appState.currentYearMonth.split('-').map(Number);
    modalSelectedYear = y || 2026;
    renderMonthCalendarModal();
    const modal = document.getElementById('month-calendar-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeMonthCalendarModal() {
    const modal = document.getElementById('month-calendar-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderMonthCalendarModal() {
    const yearLabel = document.getElementById('cal-modal-year-label');
    if (yearLabel) yearLabel.textContent = `${modalSelectedYear}年`;

    const monthsGrid = document.getElementById('cal-modal-months-grid');
    if (monthsGrid) {
      const [curY, curM] = appState.currentYearMonth.split('-').map(Number);
      let html = '';
      for (let month = 1; month <= 12; month++) {
        const isActive = (modalSelectedYear === curY && month === curM);
        html += `
          <button class="month-cell-btn ${isActive ? 'active' : ''}" data-month="${month}">
            ${month}月
          </button>
        `;
      }
      monthsGrid.innerHTML = html;

      monthsGrid.querySelectorAll('.month-cell-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const monthNum = Number(btn.getAttribute('data-month'));
          const monthStr = String(monthNum).padStart(2, '0');
          appState.currentYearMonth = `${modalSelectedYear}-${monthStr}`;
          closeMonthCalendarModal();
          renderApp();
          showToast(`${modalSelectedYear}年 ${monthNum}月に切り替えました`);
        });
      });
    }
  }

  // Budget Settings Modal Controllers
  function openBudgetEditModal() {
    const summary = getMonthSummary(appState.currentYearMonth);
    const overallInput = document.getElementById('budget-overall-input');
    const remainingInput = document.getElementById('budget-remaining-input');
    const expenseInfo = document.getElementById('budget-current-expense-info');

    if (expenseInfo) {
      expenseInfo.textContent = formatYenPlain(summary.expense);
    }

    const currentOverall = appState.budgets.overall || 0;
    const currentRemaining = Math.max(0, currentOverall - summary.expense);

    if (overallInput) overallInput.value = currentOverall;
    if (remainingInput) remainingInput.value = currentRemaining;

    // Attach two-way sync between Remaining Budget and Total Budget
    if (overallInput && !overallInput.dataset.syncBound) {
      overallInput.dataset.syncBound = 'true';
      overallInput.addEventListener('input', () => {
        const curExp = getMonthSummary(appState.currentYearMonth).expense;
        const oVal = Number(overallInput.value) || 0;
        if (remainingInput) {
          remainingInput.value = Math.max(0, oVal - curExp);
        }
      });
    }

    if (remainingInput && !remainingInput.dataset.syncBound) {
      remainingInput.dataset.syncBound = 'true';
      remainingInput.addEventListener('input', () => {
        const curExp = getMonthSummary(appState.currentYearMonth).expense;
        const rVal = Number(remainingInput.value) || 0;
        if (overallInput) {
          overallInput.value = curExp + rVal;
        }
      });
    }

    const formList = document.getElementById('budget-categories-form-list');
    if (formList) {
      const expenseCats = appState.categories.filter(c => c.type === 'expense');
      formList.innerHTML = expenseCats.map(cat => {
        const currentLimit = appState.budgets.categories[cat.id] || 0;
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:8px 12px; border-radius:var(--radius-sm);">
            <span style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600;">
              <span class="material-symbols-rounded" style="color:${cat.color}; font-size:18px;">${cat.icon}</span>
              ${cat.name}
            </span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:12px; color:var(--text-muted);">¥</span>
              <input type="number" class="cat-budget-input form-field" data-id="${cat.id}" value="${currentLimit}" style="width:110px; padding:6px 8px; font-size:13px; text-align:right;" />
            </div>
          </div>
        `;
      }).join('');
    }

    const modal = document.getElementById('budget-edit-modal');
    if (modal) modal.classList.remove('hidden');
    if (remainingInput) remainingInput.focus();
  }

  function closeBudgetEditModal() {
    const modal = document.getElementById('budget-edit-modal');
    if (modal) modal.classList.add('hidden');
  }

  function saveBudgetSettings() {
    const overallInput = document.getElementById('budget-overall-input');
    if (overallInput) {
      const val = Number(overallInput.value);
      if (!isNaN(val) && val >= 0) {
        appState.budgets.overall = val;
      }
    }

    document.querySelectorAll('.cat-budget-input').forEach(input => {
      const catId = input.getAttribute('data-id');
      const val = Number(input.value);
      if (catId && !isNaN(val)) {
        appState.budgets.categories[catId] = val;
      }
    });

    saveStateToStorage();
    closeBudgetEditModal();
    renderApp();
    showToast('予算設定を保存しました');
  }

  // Asset Settings Modal Controllers
  function setManualTotalAssets(newTotal, newLiabilities = 0) {
    if (!Array.isArray(appState.accounts)) {
      appState.accounts = [];
    }

    const assetAccounts = appState.accounts.filter(a => a.type !== 'liability' && Number(a.balance) >= 0);

    if (assetAccounts.length <= 1) {
      if (assetAccounts.length === 1) {
        assetAccounts[0].balance = newTotal;
      } else {
        appState.accounts.push({
          id: 'acc_main',
          name: 'メイン口座',
          type: 'bank',
          balance: newTotal,
          icon: 'account_balance'
        });
      }
    } else {
      const primaryAcc = appState.accounts.find(a => a.id === 'acc_mufg') || assetAccounts[0];
      const otherSum = assetAccounts.filter(a => a !== primaryAcc).reduce((s, a) => s + Number(a.balance || 0), 0);

      if (newTotal >= otherSum) {
        primaryAcc.balance = newTotal - otherSum;
      } else {
        primaryAcc.balance = newTotal;
        assetAccounts.filter(a => a !== primaryAcc).forEach(a => a.balance = 0);
      }
    }

    let liabilityAcc = appState.accounts.find(a => a.type === 'liability');
    if (newLiabilities > 0) {
      if (liabilityAcc) {
        liabilityAcc.balance = -Math.abs(newLiabilities);
      } else {
        appState.accounts.push({
          id: 'acc_card',
          name: 'クレジットカード等 (負債)',
          type: 'liability',
          balance: -Math.abs(newLiabilities),
          icon: 'credit_card'
        });
      }
    } else if (liabilityAcc) {
      liabilityAcc.balance = 0;
    }

    saveStateToStorage();
    renderApp();
  }

  function openAssetEditModal() {
    const totals = getTotalsFromAccounts();
    const totalInput = document.getElementById('asset-total-input');
    const liabilityInput = document.getElementById('asset-liability-input');
    const netPreview = document.getElementById('asset-modal-net-preview');

    if (totalInput) totalInput.value = totals.totalAssets;
    if (liabilityInput) liabilityInput.value = totals.totalLiabilities;

    function updatePreview() {
      const t = Number(totalInput ? totalInput.value : 0) || 0;
      const l = Number(liabilityInput ? liabilityInput.value : 0) || 0;
      if (netPreview) {
        netPreview.textContent = formatYenPlain(t - l);
      }
    }

    updatePreview();

    if (totalInput && !totalInput.dataset.previewBound) {
      totalInput.dataset.previewBound = 'true';
      totalInput.addEventListener('input', updatePreview);
    }

    if (liabilityInput && !liabilityInput.dataset.previewBound) {
      liabilityInput.dataset.previewBound = 'true';
      liabilityInput.addEventListener('input', updatePreview);
    }

    const modal = document.getElementById('asset-edit-modal');
    if (modal) modal.classList.remove('hidden');
    if (totalInput) totalInput.focus();
  }

  function closeAssetEditModal() {
    const modal = document.getElementById('asset-edit-modal');
    if (modal) modal.classList.add('hidden');
  }

  function saveAssetSettings() {
    const totalInput = document.getElementById('asset-total-input');
    const liabilityInput = document.getElementById('asset-liability-input');

    const newTotal = Number(totalInput ? totalInput.value : 0);
    const newLiability = Number(liabilityInput ? liabilityInput.value : 0);

    if (isNaN(newTotal) || newTotal < 0) {
      showToast('有効な総資産額を入力してください');
      return;
    }

    setManualTotalAssets(newTotal, isNaN(newLiability) ? 0 : Math.max(0, newLiability));
    closeAssetEditModal();
    showToast('総資産を更新しました');
  }

  // ==================================================
  // 8. INPUT MODAL CONTROLLERS (MANUAL / OCR / AI)
  // ==================================================

  function openInputModal() {
    populateInputModalSelects();
    renderQuickCategoriesBar();
    document.getElementById('input-date-val').value = getTodayStr();
    document.getElementById('input-modal-overlay').classList.remove('hidden');
  }

  function closeInputModal() {
    document.getElementById('input-modal-overlay').classList.add('hidden');
  }

  function switchInputTab(mode) {
    ['manual', 'receipt', 'ai'].forEach(m => {
      document.getElementById(`input-tab-${m}`).classList.toggle('active', m === mode);
      document.getElementById(`input-view-${m}`).classList.toggle('active', m === mode);
      document.getElementById(`input-view-${m}`).classList.toggle('hidden', m !== mode);
    });
  }

  function populateInputModalSelects() {
    const accSelect = document.getElementById('input-account-val');
    const toAccSelect = document.getElementById('input-to-account-val');

    const options = appState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    accSelect.innerHTML = options;
    toAccSelect.innerHTML = options;
  }

  function renderQuickCategoriesBar() {
    const bar = document.getElementById('quick-categories-bar');
    const typeCats = appState.categories.filter(c => c.type === appState.inputModalState.type || (appState.inputModalState.type === 'transfer' && c.type === 'transfer'));

    bar.innerHTML = typeCats.map(c => `
      <button class="cat-chip-btn ${c.id === appState.inputModalState.categoryId ? 'selected' : ''}" data-id="${c.id}">
        <span class="material-symbols-rounded">${c.icon}</span> ${c.name}
      </button>
    `).join('');

    bar.querySelectorAll('.cat-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        appState.inputModalState.categoryId = btn.getAttribute('data-id');
        renderQuickCategoriesBar();
        updateSelectedCatBadge();
      });
    });

    updateSelectedCatBadge();
  }

  function updateSelectedCatBadge() {
    const cat = getCategoryById(appState.inputModalState.categoryId);
    document.getElementById('selected-cat-icon').textContent = cat.icon;
    document.getElementById('selected-cat-name').textContent = cat.name;
  }

  function setupTypeSelectorEvents() {
    document.querySelectorAll('.transaction-type-selector .type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.transaction-type-selector .type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.getAttribute('data-type');
        appState.inputModalState.type = type;

        const isTransfer = type === 'transfer';
        document.getElementById('transfer-destination-field').classList.toggle('hidden', !isTransfer);

        const matchingCat = appState.categories.find(c => c.type === type);
        if (matchingCat) appState.inputModalState.categoryId = matchingCat.id;

        renderQuickCategoriesBar();
      });
    });
  }

  function setupKeypadEvents() {
    const display = document.getElementById('keypad-display-amount');

    document.querySelectorAll('.keypad-btn.num').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (appState.inputModalState.amountStr === '0') {
          appState.inputModalState.amountStr = val;
        } else {
          appState.inputModalState.amountStr += val;
        }
        display.textContent = Number(appState.inputModalState.amountStr).toLocaleString('ja-JP');
      });
    });

    document.getElementById('btn-num-del').addEventListener('click', () => {
      let str = appState.inputModalState.amountStr;
      str = str.slice(0, -1);
      if (!str || str === '') str = '0';
      appState.inputModalState.amountStr = str;
      display.textContent = Number(str).toLocaleString('ja-JP');
    });

    document.getElementById('btn-num-clear').addEventListener('click', () => {
      appState.inputModalState.amountStr = '0';
      display.textContent = '0';
    });

    // Merchant chip fill
    document.querySelectorAll('.merchant-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('input-merchant-val').value = chip.getAttribute('data-merchant');
      });
    });

    // 3-Tap Fast Submit
    document.getElementById('btn-fast-submit').addEventListener('click', saveManualTransaction);
  }

  function saveManualTransaction() {
    const amount = Number(appState.inputModalState.amountStr);
    if (amount <= 0) {
      alert('1円以上の金額を入力してください');
      return;
    }

    const merchantInput = document.getElementById('input-merchant-val');
    const newTx = {
      id: generateUUID(),
      type: appState.inputModalState.type,
      amount: amount,
      date: (document.getElementById('input-date-val') || {}).value || getTodayStr(),
      category_id: appState.inputModalState.categoryId,
      account_id: (document.getElementById('input-account-val') || {}).value || 'acc_cash',
      to_account_id: appState.inputModalState.type === 'transfer' ? (document.getElementById('input-to-account-val') || {}).value : undefined,
      merchant: merchantInput ? merchantInput.value : undefined,
      memo: (document.getElementById('input-memo-val') || {}).value || undefined,
      tags: (document.getElementById('input-tags-val') || {}).value ? document.getElementById('input-tags-val').value.split(',').map(t => t.trim()) : [],
      source: 'manual',
      user_verified: true
    };

    // Apply to Account Balance
    applyAccountBalanceChange(newTx);

    appState.transactions.unshift(newTx);
    saveStateToStorage();

    // Reset Modal
    appState.inputModalState.amountStr = '0';
    document.getElementById('keypad-display-amount').textContent = '0';
    closeInputModal();

    renderApp();
    showToast('取引を記録しました');
  }

  function applyAccountBalanceChange(tx) {
    const sourceAcc = getAccountById(tx.account_id);

    if (tx.type === 'expense') {
      sourceAcc.balance -= tx.amount;
    } else if (tx.type === 'income') {
      sourceAcc.balance += tx.amount;
    } else if (tx.type === 'transfer' && tx.to_account_id) {
      sourceAcc.balance -= tx.amount;
      const targetAcc = getAccountById(tx.to_account_id);
      if (targetAcc) targetAcc.balance += tx.amount;
    }
  }

  function deleteTransaction(id) {
    const index = appState.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      const deleted = appState.transactions.splice(index, 1)[0];
      
      // Revert Account Balance
      const sourceAcc = getAccountById(deleted.account_id);
      if (deleted.type === 'expense') sourceAcc.balance += deleted.amount;
      if (deleted.type === 'income') sourceAcc.balance -= deleted.amount;
      if (deleted.type === 'transfer' && deleted.to_account_id) {
        sourceAcc.balance += deleted.amount;
        const targetAcc = getAccountById(deleted.to_account_id);
        if (targetAcc) targetAcc.balance -= deleted.amount;
      }

      appState.deletedTransactionStack.push(deleted);
      saveStateToStorage();
      renderApp();

      showUndoToast('取引を削除しました', () => {
        const restored = appState.deletedTransactionStack.pop();
        if (restored) {
          appState.transactions.unshift(restored);
          applyAccountBalanceChange(restored);
          saveStateToStorage();
          renderApp();
          showToast('元に戻しました');
        }
      });
    }
  }

  // OCR LISTENERS
  function setupOCRListeners() {
    const dropzone = document.getElementById('receipt-dropzone');
    const fileInput = document.getElementById('receipt-file-input');

    document.getElementById('select-receipt-btn').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => handleReceiptScan());

    document.getElementById('save-ocr-btn').addEventListener('click', () => {
      const merchantEl = document.getElementById('ocr-merchant-input');
      const merchant = merchantEl ? merchantEl.value : undefined;
      const amount = Number((document.getElementById('ocr-amount-input') || {}).value || 0);
      const date = (document.getElementById('ocr-date-input') || {}).value || getTodayStr();
      const catId = (document.getElementById('ocr-category-select') || {}).value || 'cat_food';

      const newTx = {
        id: generateUUID(),
        type: 'expense',
        amount: amount,
        date: date,
        category_id: catId,
        account_id: 'acc_cash',
        merchant: merchant,
        memo: 'レシートOCR自動読み取り',
        tags: ['#レシート'],
        source: 'ocr',
        user_verified: true
      };

      applyAccountBalanceChange(newTx);
      appState.transactions.unshift(newTx);
      saveStateToStorage();
      closeInputModal();
      renderApp();
      showToast('レシートから登録完了しました');
    });
  }

  function handleReceiptScan() {
    document.getElementById('receipt-dropzone').classList.add('hidden');
    document.getElementById('receipt-scanning-box').classList.remove('hidden');

    setTimeout(() => {
      document.getElementById('receipt-scanning-box').classList.add('hidden');
      document.getElementById('receipt-ocr-result').classList.remove('hidden');

      const dateInput = document.getElementById('ocr-date-input');
      if (dateInput) dateInput.value = getTodayStr();
      const catSelect = document.getElementById('ocr-category-select');
      if (catSelect) catSelect.innerHTML = appState.categories.filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }, 1200);
  }

  // AI & VOICE LISTENERS
  function setupAIListeners() {
    const parseBtn = document.getElementById('ai-parse-btn');
    const recordBtn = document.getElementById('voice-record-btn');

    if (parseBtn) {
      parseBtn.addEventListener('click', () => {
        const text = (document.getElementById('ai-text-input') || {}).value ? document.getElementById('ai-text-input').value.trim() : '';
        if (!text) {
          alert('「昨日ランチで450円」などの文章を入力してください');
          return;
        }
        parseNaturalLanguage(text);
      });
    }

    // Voice recognition
    if (recordBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';

      recordBtn.addEventListener('click', () => {
        const statusText = document.getElementById('voice-status-text');
        if (statusText) statusText.textContent = '音声聞き取り中... お喋りください';
        recognition.start();
      });

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        const textInput = document.getElementById('ai-text-input');
        const statusText = document.getElementById('voice-status-text');
        if (textInput) textInput.value = transcript;
        if (statusText) statusText.textContent = `認識完了: 「${transcript}」`;
        parseNaturalLanguage(transcript);
      };
    }
  }

  function parseNaturalLanguage(text) {
    // Regex Amount Extractor
    const amountMatch = text.match(/(\d+[\d,]*)\s*円/);
    if (!amountMatch) {
      alert('金額（○○円）が認識できませんでした。「金額（例: 450円）」を含めて再入力してください');
      return;
    }

    const amount = Number(amountMatch[1].replace(/,/g, ''));
    let merchant = '手動テキスト';
    let catId = 'cat_food';

    if (text.includes('セブン') || text.includes('コンビニ') || text.includes('ローソン')) {
      merchant = 'コンビニ';
      catId = 'cat_food';
    } else if (text.includes('Amazon') || text.includes('アマゾン')) {
      merchant = 'Amazon';
      catId = 'cat_daily';
    } else if (text.includes('ラーメン') || text.includes('昼') || text.includes('カフェ')) {
      merchant = '外食・ランチ';
      catId = 'cat_food';
    }

    let dateStr = getTodayStr();
    if (text.includes('昨日')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const pDate = document.getElementById('parsed-date');
    const pMerch = document.getElementById('parsed-merchant');
    const pAmt = document.getElementById('parsed-amount');
    const pCat = document.getElementById('parsed-category');

    if (pDate) pDate.textContent = dateStr;
    if (pMerch) pMerch.textContent = merchant;
    if (pAmt) pAmt.textContent = formatYenPlain(amount);
    if (pCat) pCat.textContent = getCategoryById(catId).name;

    const parsedCard = document.getElementById('ai-parsed-card');
    if (parsedCard) parsedCard.classList.remove('hidden');

    document.getElementById('save-ai-parsed-btn').onclick = () => {
      const newTx = {
        id: generateUUID(),
        type: 'expense',
        amount: amount,
        date: dateStr,
        category_id: catId,
        account_id: 'acc_cash',
        merchant: merchant,
        memo: `AI自動構造化 (${text})`,
        tags: ['#AI入力'],
        source: 'ai',
        user_verified: true
      };

      applyAccountBalanceChange(newTx);
      appState.transactions.unshift(newTx);
      saveStateToStorage();
      closeInputModal();
      renderApp();
      showToast('AI解析取引を登録しました');
    };
  }

  // AI EVIDENCE MODAL
  function openAIEvidenceModal(insight) {
    document.getElementById('ai-modal-title').textContent = insight.title;
    document.getElementById('ai-modal-message').textContent = insight.message;

    const tbody = document.getElementById('ai-evidence-tbody');
    const ev = insight.evidence;
    const diffSign = ev.diff > 0 ? '+' : '';

    tbody.innerHTML = `
      <tr>
        <td><strong>${ev.label}</strong></td>
        <td>${formatYenPlain(ev.previous_value)}</td>
        <td>${formatYenPlain(ev.current_value)}</td>
        <td style="color:${ev.diff > 0 ? 'var(--color-expense)' : 'var(--color-income)'}; font-weight:800;">
          ${diffSign}${formatYenPlain(ev.diff)}
        </td>
      </tr>
    `;

    document.getElementById('ai-evidence-modal').classList.remove('hidden');
  }

  function closeAIEvidenceModal() {
    document.getElementById('ai-evidence-modal').classList.add('hidden');
  }

  function setupAnalyticsTabEvents() {
    const subTabs = [
      { btnId: 'btn-chart-pie', viewId: 'analytics-pie-view' },
      { btnId: 'btn-chart-bar', viewId: 'analytics-bar-view' },
      { btnId: 'btn-chart-fixed', viewId: 'analytics-fixed-view' },
      { btnId: 'btn-tab-budget', viewId: 'analytics-budget-view' }
    ];

    subTabs.forEach(tab => {
      document.getElementById(tab.btnId).addEventListener('click', () => {
        subTabs.forEach(t => {
          document.getElementById(t.btnId).classList.remove('active');
          document.getElementById(t.viewId).classList.remove('active');
          document.getElementById(t.viewId).classList.add('hidden');
        });
        document.getElementById(tab.btnId).classList.add('active');
        document.getElementById(tab.viewId).classList.add('active');
        document.getElementById(tab.viewId).classList.remove('hidden');

        if (tab.btnId === 'btn-chart-bar') {
          renderMonthlyBarChart();
        } else if (tab.btnId === 'btn-chart-pie') {
          renderCategoryDonutChart();
        }
      });
    });
  }

  // EXPORT TO CSV
  function exportToCSV() {
    let csv = 'ID,Type,Amount,Date,CategoryID,AccountID,Merchant,Memo,Tags,Source\n';

    appState.transactions.forEach(t => {
      csv += `"${t.id}","${t.type}",${t.amount},"${t.date}","${t.category_id}","${t.account_id}","${t.merchant || ''}","${t.memo || ''}","${(t.tags || []).join(';')}","${t.source}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zenith_money_export_${appState.currentYearMonth}.csv`;
    link.click();
    showToast('CSVファイルを書き出しました');
  }

  // TOAST SYSTEM
  function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-income)">check_circle</span> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function showUndoToast(msg, undoFn) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <span>${msg}</span>
      <button class="undo-btn">元に戻す</button>
    `;

    toast.querySelector('.undo-btn').addEventListener('click', () => {
      undoFn();
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // ==================================================
  // 9. APP INITIALIZATION BOOTSTRAP
  // ==================================================

  function initApp() {
    try {
      loadStateFromStorage();
      // Ensure app always starts on current date & current month on Home
      appState.currentYearMonth = getCurrentYearMonthStr();
      appState.activeTab = 'tab-home';
      appState.inputModalState.date = getTodayStr();

      setupEventListeners();
      renderApp();

      // Whenever user returns to the app from background or unlocks device, sync to current date and refresh Home
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          appState.currentYearMonth = getCurrentYearMonthStr();
          appState.inputModalState.date = getTodayStr();
          renderApp();
        }
      });
      window.addEventListener('focus', () => {
        appState.currentYearMonth = getCurrentYearMonthStr();
        appState.inputModalState.date = getTodayStr();
        renderApp();
      });

      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('sw.js').catch(err => console.warn('Offline SW register skipped:', err));
        });
      }
    } catch (err) {
      console.error('App init error, resetting storage fallback:', err);
      localStorage.removeItem('zenith_money_state_v3');
      appState.currentYearMonth = getCurrentYearMonthStr();
      appState.transactions = generateSampleTransactions();
      renderApp();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
