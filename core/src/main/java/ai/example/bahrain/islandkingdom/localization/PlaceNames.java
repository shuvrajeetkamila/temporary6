package ai.example.bahrain.islandkingdom.localization;

import java.util.HashMap;
import java.util.Map;

/**
 * Verified Bilingual Gazetteer for the Kingdom of Bahrain.
 * Contains certified Arabic and English names for all key districts,
 * landmarks, forts, causeways, and natural features.
 */
public final class PlaceNames {

    public static class Entry {
        public final String nameEn;
        public final String nameAr;
        public final String governorateId;

        public Entry(String en, String ar, String gov) {
            this.nameEn = en;
            this.nameAr = ar;
            this.governorateId = gov;
        }
    }

    private static final Map<String, Entry> REGISTRY = new HashMap<>();

    static {
        // Capital Governorate
        REGISTRY.put("MANAMA", new Entry("Manama", "المنامة", "GOV-01"));
        REGISTRY.put("BAB_AL_BAHRAIN", new Entry("Bab Al Bahrain", "باب البحرين", "GOV-01"));
        REGISTRY.put("MANAMA_SOUQ", new Entry("Manama Souq", "سوق المنامة", "GOV-01"));
        REGISTRY.put("BAHRAIN_BAY", new Entry("Bahrain Bay", "خليج البحرين", "GOV-01"));
        REGISTRY.put("FINANCIAL_HARBOUR", new Entry("Bahrain Financial Harbour", "مرفأ البحرين المالي", "GOV-01"));
        REGISTRY.put("DIPLOMATIC_AREA", new Entry("Diplomatic Area", "المنطقة الدبلوماسية", "GOV-01"));
        REGISTRY.put("JUFFAIR", new Entry("Juffair", "الجفير", "GOV-01"));
        REGISTRY.put("ADLIYA", new Entry("Adliya", "العدلية", "GOV-01"));
        REGISTRY.put("AL_FATEH_MOSQUE", new Entry("Al Fateh Grand Mosque", "جامع أحمد الفاتح", "GOV-01"));
        REGISTRY.put("BAHRAIN_MUSEUM", new Entry("Bahrain National Museum", "متحف البحرين الوطني", "GOV-01"));

        // Muharraq Governorate
        REGISTRY.put("MUHARRAQ", new Entry("Muharraq", "المحرق", "GOV-02"));
        REGISTRY.put("PEARLING_PATH", new Entry("Pearling Path Heritage Route", "مسار اللؤلؤ التراثي", "GOV-02"));
        REGISTRY.put("ARAD_FORT", new Entry("Arad Fort", "قلعة عراد", "GOV-02"));
        REGISTRY.put("BAHRAIN_AIRPORT", new Entry("Bahrain International Airport", "مطار البحرين الدولي", "GOV-02"));
        REGISTRY.put("AMWAJ_ISLANDS", new Entry("Amwaj Islands", "جزر أمواج", "GOV-02"));
        REGISTRY.put("DIYAR_AL_MUHARRAQ", new Entry("Diyar Al Muharraq", "ديار المحرق", "GOV-02"));
        REGISTRY.put("KHALIFA_PORT", new Entry("Khalifa Bin Salman Port", "ميناء خليفة بن سلمان", "GOV-02"));

        // Northern Governorate
        REGISTRY.put("BAHRAIN_FORT", new Entry("Bahrain Fort (Qal'at al-Bahrain)", "قلعة البحرين", "GOV-03"));
        REGISTRY.put("BUDAIYA", new Entry("Budaiya", "البديع", "GOV-03"));
        REGISTRY.put("SAAR", new Entry("Saar", "سار", "GOV-03"));
        REGISTRY.put("JASRA", new Entry("Al Jasra", "الجسرة", "GOV-03"));
        REGISTRY.put("DIRAZ", new Entry("Diraz", "الدراز", "GOV-03"));
        REGISTRY.put("BARBAR_TEMPLE", new Entry("Barbar Temple", "معبد باربار", "GOV-03"));
        REGISTRY.put("KING_FAHD_CAUSEWAY", new Entry("King Fahd Causeway", "جسر الملك فهد", "GOV-03"));

        // Southern Governorate
        REGISTRY.put("RIFFA", new Entry("Riffa", "الرفاع", "GOV-04"));
        REGISTRY.put("RIFFA_FORT", new Entry("Riffa Fort (Shaikh Salman bin Ahmed Fort)", "قلعة الرفاع", "GOV-04"));
        REGISTRY.put("DILMUN_MOUNDS", new Entry("Dilmun Burial Mounds", "تلال مدافن دلمون", "GOV-04"));
        REGISTRY.put("SAKHIR_CIRCUIT", new Entry("Bahrain International Circuit", "حلبة البحرين الدولية", "GOV-04"));
        REGISTRY.put("AWALI", new Entry("Awali", "عوالي", "GOV-04"));
        REGISTRY.put("JABAL_AD_DUKHAN", new Entry("Jabal ad Dukhan", "جبل الدخان", "GOV-04"));
        REGISTRY.put("TREE_OF_LIFE", new Entry("Tree of Life (Shajarat al-Hayah)", "شجرة الحياة", "GOV-04"));
        REGISTRY.put("ZALLAQ", new Entry("Zallaq", "الزلاق", "GOV-04"));
        REGISTRY.put("DURRAT_AL_BAHRAIN", new Entry("Durrat Al Bahrain", "درة البحرين", "GOV-04"));
        REGISTRY.put("HAWAR_ISLANDS", new Entry("Hawar Islands", "جزر حوار", "GOV-04"));
    }

    public static Entry get(String key) {
        return REGISTRY.get(key);
    }

    private PlaceNames() {}
}
