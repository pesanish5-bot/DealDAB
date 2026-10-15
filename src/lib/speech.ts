export type SpokenLanguage = "en-IN" | "hi-IN";

const hindiTerms: Record<string, string> = {
  "A3 colour posters": "ए थ्री रंगीन पोस्टर",
  "A5 colour flyers": "ए फाइव रंगीन फ्लायर्स",
  "Roll-up standees": "रोल-अप स्टैंडी",
  "digital proof": "डिजिटल प्रूफ",
  "50 extra flyers": "पचास अतिरिक्त फ्लायर्स",
  "one colour-correction reprint": "एक कलर-करेक्शन रीप्रिंट",
  "artwork locked before 6 PM": "आर्टवर्क शाम छह बजे से पहले लॉक होना चाहिए",
  "full payment before production": "उत्पादन से पहले पूरा भुगतान",
  "approved proof returned before 7 PM": "स्वीकृत प्रूफ शाम सात बजे से पहले लौटाना होगा",
};

function translateTerms(value: string) {
  return Object.entries(hindiTerms).reduce(
    (translated, [english, hindi]) => translated.replaceAll(english, hindi),
    value,
  );
}

export function speechText(text: string, language: SpokenLanguage): string {
  if (language === "en-IN") return text.replaceAll("INR", "rupees");

  if (text === "Hello, I am DealDAB. I will negotiate without making a purchase commitment.") {
    return "नमस्ते, मैं डीलडैब हूँ। मैं खरीदारी की कोई प्रतिबद्धता किए बिना बातचीत करूँगी।";
  }

  const hello = text.match(/^Hello, I am DealDAB, an AI assistant calling for a college event team\. This is a simulated vendor call\. Please quote (.+)\.$/);
  if (hello) return `नमस्ते, मैं डीलडैब हूँ, कॉलेज इवेंट टीम की एआई सहायक। यह एक सिम्युलेटेड वेंडर कॉल है। कृपया ${translateTerms(hello[1])} का कोटेशन दें।`;

  const initial = text.match(/^Our initial total is INR ([\d,]+)\. We can deliver at (.+)\.$/);
  if (initial) return `हमारा शुरुआती कुल मूल्य ${initial[1]} रुपये है। हम ${initial[2]} बजे तक डिलीवरी कर सकते हैं।`;

  const counter = text.match(/^Our target is INR ([\d,]+) and our maximum acceptable quote is INR ([\d,]+)\. Can you improve the total while preserving the deadline and digital proof\?$/);
  if (counter) return `हमारा लक्ष्य ${counter[1]} रुपये है और अधिकतम स्वीकार्य कीमत ${counter[2]} रुपये है। क्या आप समय सीमा और डिजिटल प्रूफ बनाए रखते हुए कुल कीमत कम कर सकते हैं?`;

  const revised = text.match(/^We can revise the complete order to INR ([\d,]+), deliver at (.+), and include (.+)\.$/);
  if (revised) return `हम पूरे ऑर्डर की कीमत ${revised[1]} रुपये कर सकते हैं, ${revised[2]} बजे तक डिलीवरी करेंगे, और ${translateTerms(revised[3])} शामिल करेंगे।`;

  const finalOffer = text.match(/^Final offer: INR ([\d,]+)\. Delivery remains (.+)\. Conditions: (.+)\.$/);
  if (finalOffer) return `अंतिम प्रस्ताव ${finalOffer[1]} रुपये है। डिलीवरी ${finalOffer[2]} बजे रहेगी। शर्तें: ${translateTerms(finalOffer[3])}।`;

  if (text === "The simulated business did not answer.") {
    return "सिम्युलेटेड व्यवसाय ने कॉल का उत्तर नहीं दिया।";
  }

  return translateTerms(text).replaceAll("INR", "रुपये");
}
