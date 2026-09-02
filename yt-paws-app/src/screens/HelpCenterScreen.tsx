import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PUBLIC_WEB_URL } from '../api/client';
import { HelpArticle, HelpCategory, helpProvider } from '../help/helpProvider';
import { useLanguage } from '../i18n/LanguageContext';

const categories: Array<HelpCategory | 'all'> = ['all', 'booking', 'payments', 'pets', 'account'];

const HelpCenterScreen = () => {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HelpCategory | 'all'>('all');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    helpProvider
      .search(language, query, category === 'all' ? undefined : category)
      .then((results) => {
        if (active) setArticles(results);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, language, query]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.helpCenter.title}</Text>
        <Text style={styles.subtitle}>{t.helpCenter.subtitle}</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.helpCenter.searchPlaceholder}
          placeholderTextColor="#7D8983"
          style={styles.searchInput}
          accessibilityLabel={t.helpCenter.searchPlaceholder}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {categories.map((item) => {
            const selected = category === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                  {t.helpCenter.categories[item]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#1F4A38" style={styles.loader} />
        ) : articles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.helpCenter.noResults}</Text>
            <Text style={styles.emptyText}>{t.helpCenter.noResultsHint}</Text>
          </View>
        ) : (
          articles.map((article) => {
            const expanded = expandedId === article.id;
            return (
              <TouchableOpacity
                key={article.id}
                activeOpacity={0.8}
                style={styles.articleCard}
                onPress={() => setExpandedId(expanded ? null : article.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <View style={styles.questionRow}>
                  <Text style={styles.question}>{article.question}</Text>
                  <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
                </View>
                {expanded && <Text style={styles.answer}>{article.answer}</Text>}
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>{t.helpCenter.stillNeedHelp}</Text>
          <Text style={styles.supportText}>{t.helpCenter.supportHint}</Text>
          <TouchableOpacity style={styles.supportButton} onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/support`)}>
            <Text style={styles.supportButtonText}>{t.helpCenter.contactSupport}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { marginTop: 6, marginBottom: 18, fontSize: 15, lineHeight: 22, color: '#666' },
  searchInput: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F7F5EF',
    paddingHorizontal: 16,
    color: '#1A1A1A',
    fontSize: 16,
  },
  categories: { gap: 8, paddingVertical: 16 },
  categoryChip: {
    borderRadius: 20,
    backgroundColor: '#F7F5EF',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  categoryChipSelected: { backgroundColor: '#1F4A38' },
  categoryText: { color: '#666', fontWeight: '600' },
  categoryTextSelected: { color: '#F5EFE0' },
  loader: { marginVertical: 36 },
  emptyCard: { borderRadius: 14, padding: 20, backgroundColor: '#F7F5EF', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyText: { marginTop: 6, color: '#666', textAlign: 'center', lineHeight: 20 },
  articleCard: { marginBottom: 10, borderRadius: 14, backgroundColor: '#F7F5EF', padding: 16 },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  question: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#1A1A1A' },
  chevron: { fontSize: 23, color: '#1F4A38', fontWeight: '500' },
  answer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E1D5', lineHeight: 22, color: '#666' },
  supportCard: { marginTop: 14, borderRadius: 16, backgroundColor: '#F5EFE0', padding: 20 },
  supportTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  supportText: { marginTop: 6, lineHeight: 21, color: '#666' },
  supportButton: { marginTop: 15, borderRadius: 24, backgroundColor: '#1F4A38', paddingVertical: 14, alignItems: 'center' },
  supportButtonText: { color: '#F5EFE0', fontWeight: '700', fontSize: 15 },
});

export default HelpCenterScreen;
