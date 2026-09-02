import type { Language } from '../i18n/translations';

export type HelpCategory = 'booking' | 'payments' | 'pets' | 'account';

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  keywords: string[];
}

export interface HelpProvider {
  search(language: Language, query: string, category?: HelpCategory): Promise<HelpArticle[]>;
}

const articles: Record<Language, HelpArticle[]> = {
  en: [
    {
      id: 'create-booking',
      category: 'booking',
      question: 'How do I make a booking?',
      answer:
        'Open Booking, select a service and one of your pets, choose the dates or time, then review and submit. Your new booking will appear in My Bookings.',
      keywords: ['book', 'booking', 'service', 'date', 'time', '预约'],
    },
    {
      id: 'booking-status',
      category: 'booking',
      question: 'Where can I check my booking status?',
      answer:
        'Open Profile → My Bookings and select a booking. The detail page shows its current status, assigned staff when applicable, service details and payment information.',
      keywords: ['status', 'staff', 'detail', 'pending', 'confirmed', '状态'],
    },
    {
      id: 'change-cancel-booking',
      category: 'booking',
      question: 'How do I change or cancel a booking?',
      answer:
        'Please contact Y&T Paws support before the service starts. Cancellation and refund eligibility depend on the booking and payment state, so support must confirm the outcome.',
      keywords: ['change', 'cancel', 'date', 'refund', '取消', '修改'],
    },
    {
      id: 'payment-methods',
      category: 'payments',
      question: 'Which payment methods are available?',
      answer:
        'A booking may offer Stripe card checkout or WeChat QR payment, depending on the business configuration. For WeChat payment, follow the displayed instructions and wait for the business to verify the transfer.',
      keywords: ['pay', 'payment', 'stripe', 'card', 'wechat', 'qr', '支付', '微信'],
    },
    {
      id: 'payment-status',
      category: 'payments',
      question: 'Why is my payment still pending?',
      answer:
        'Card payments update after Stripe confirms checkout. WeChat transfers require manual verification by the business. Open the booking detail or Payment History to check the latest recorded status.',
      keywords: ['pending', 'paid', 'verify', 'history', '付款', '待确认'],
    },
    {
      id: 'refund',
      category: 'payments',
      question: 'How do refunds work?',
      answer:
        'Contact support with the booking details. An owner or admin reviews refund eligibility and records the result. Do not make a second payment while a refund or payment verification is in progress.',
      keywords: ['refund', 'money', 'cancel', '退款'],
    },
    {
      id: 'pet-profile',
      category: 'pets',
      question: 'How do I add or update my pet?',
      answer:
        'You can add a pet from Profile or while creating a booking. Open the pet from Profile to review and update its care and health information before the service starts.',
      keywords: ['pet', 'dog', 'cat', 'health', 'care', '宠物', '健康'],
    },
    {
      id: 'daily-reports',
      category: 'pets',
      question: 'Where can I see daily care reports?',
      answer:
        'Open Reports from the main navigation. Reports published for your bookings can include care notes and photos. If an expected report is missing, contact the business.',
      keywords: ['report', 'photo', 'care', 'daily', '日报', '照片'],
    },
    {
      id: 'reset-password',
      category: 'account',
      question: 'I forgot my password. What should I do?',
      answer:
        'On the sign-in screen, enter your email and tap Forgot password. If an active account exists, a single-use reset link will be emailed to you. Request a new link if the previous one has expired.',
      keywords: ['password', 'reset', 'email', 'login', '密码', '登录'],
    },
    {
      id: 'delete-account',
      category: 'account',
      question: 'How do I delete my account?',
      answer:
        'Open Profile → Settings → Delete account and complete the confirmation. Personal and pet-care data is deleted or anonymised; minimal booking and payment records may be retained for accounting, refunds, fraud prevention and disputes.',
      keywords: ['delete', 'account', 'privacy', 'data', '删除', '隐私'],
    },
  ],
  zh: [
    {
      id: 'create-booking',
      category: 'booking',
      question: '如何创建预约？',
      answer: '打开“预约”，选择服务和宠物，再选择日期或时间，检查信息后提交。新预约会显示在“我的预约”中。',
      keywords: ['预约', '服务', '日期', '时间', 'book', 'booking'],
    },
    {
      id: 'booking-status',
      category: 'booking',
      question: '在哪里查看预约状态？',
      answer: '打开“个人中心 → 我的预约”并选择一条预约。详情页会显示当前状态、适用时的负责员工、服务详情和付款信息。',
      keywords: ['状态', '员工', '详情', '待确认', '已确认', 'status'],
    },
    {
      id: 'change-cancel-booking',
      category: 'booking',
      question: '如何修改或取消预约？',
      answer: '请在服务开始前联系 Y&T Paws 客服。能否取消或退款取决于预约和付款状态，需要由客服确认处理结果。',
      keywords: ['修改', '取消', '日期', '退款', 'change', 'cancel'],
    },
    {
      id: 'payment-methods',
      category: 'payments',
      question: '支持哪些付款方式？',
      answer: '根据商家配置，预约可能支持 Stripe 银行卡结账或微信二维码付款。微信付款后请按照页面提示操作，并等待商家人工核实转账。',
      keywords: ['付款', '支付', 'stripe', '银行卡', '微信', '二维码'],
    },
    {
      id: 'payment-status',
      category: 'payments',
      question: '为什么付款仍显示待确认？',
      answer: '银行卡付款会在 Stripe 确认后更新；微信转账需要商家人工核实。请在预约详情或“支付记录”中查看最新状态。',
      keywords: ['待确认', '已付款', '核实', '记录', 'pending', 'paid'],
    },
    {
      id: 'refund',
      category: 'payments',
      question: '如何申请退款？',
      answer: '请携带预约信息联系客服。Owner 或管理员会审核退款资格并记录处理结果。退款或付款核实进行中时，请勿重复付款。',
      keywords: ['退款', '取消', '钱', 'refund'],
    },
    {
      id: 'pet-profile',
      category: 'pets',
      question: '如何添加或修改宠物信息？',
      answer: '可以在个人中心或创建预约时添加宠物。服务开始前，请从个人中心打开宠物资料，检查并更新护理和健康信息。',
      keywords: ['宠物', '狗', '猫', '健康', '护理', 'pet'],
    },
    {
      id: 'daily-reports',
      category: 'pets',
      question: '在哪里查看每日护理报告？',
      answer: '从主导航打开“日报”。已发布的预约日报可以包含护理记录和照片。如果应有的日报没有显示，请联系商家。',
      keywords: ['日报', '照片', '护理', '报告', 'report'],
    },
    {
      id: 'reset-password',
      category: 'account',
      question: '忘记密码怎么办？',
      answer: '在登录页输入邮箱并点击“忘记密码”。如果存在有效账号，系统会发送一条只能使用一次的重置链接；链接过期后请重新申请。',
      keywords: ['密码', '重置', '邮箱', '登录', 'password'],
    },
    {
      id: 'delete-account',
      category: 'account',
      question: '如何删除账号？',
      answer: '打开“个人中心 → 设置 → 删除账号”并完成确认。个人和宠物护理数据会被删除或匿名化；为满足记账、退款、防欺诈及争议处理要求，最少量的预约和付款记录可能会被保留。',
      keywords: ['删除', '账号', '隐私', '数据', 'delete', 'privacy'],
    },
  ],
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

class LocalHelpProvider implements HelpProvider {
  async search(language: Language, query: string, category?: HelpCategory): Promise<HelpArticle[]> {
    const needle = normalize(query);

    return articles[language].filter((article) => {
      if (category && article.category !== category) return false;
      if (!needle) return true;

      return normalize([article.question, article.answer, ...article.keywords].join(' ')).includes(needle);
    });
  }
}

// The screen depends on this interface rather than an AI SDK. A future remote
// agent can implement HelpProvider without exposing a provider key in the App.
export const helpProvider: HelpProvider = new LocalHelpProvider();
