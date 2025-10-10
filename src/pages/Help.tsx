import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Bot } from "lucide-react";
import { useState } from "react";
import { PhilAIChat } from "@/components/PhilAIChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      question: "How do I create an account?",
      answer: "Click on the 'Sign Up' button on the homepage and fill in your details. You'll need to provide a valid email address and create a secure password. After registration, complete your profile to start matching!"
    },
    {
      question: "How does the matching algorithm work?",
      answer: "Our intelligent matching algorithm considers your profile information, interests, preferences, and activity patterns to suggest compatible matches. The more complete your profile, the better matches you'll receive."
    },
    {
      question: "Is my data safe and private?",
      answer: "Absolutely! We use industry-standard encryption to protect your data. Your personal information is never shared with third parties without your explicit consent. Read our Privacy Policy for more details."
    },
    {
      question: "How do I report inappropriate behavior?",
      answer: "You can report any user directly from their profile or chat window by clicking the three-dot menu and selecting 'Report User'. Our team reviews all reports within 24 hours."
    },
    {
      question: "Can I block someone?",
      answer: "Yes! You can block any user from the chat menu. Once blocked, they won't be able to contact you or see your profile."
    },
    {
      question: "What subscription plans do you offer?",
      answer: "We offer Free, Premium, and VIP subscription tiers. Premium unlocks unlimited likes and advanced filters, while VIP includes all Premium features plus priority matching and verification badges."
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings > Account > Delete Account. Please note this action is permanent and cannot be undone. All your data will be removed from our servers."
    },
    {
      question: "Why am I not getting matches?",
      answer: "Make sure your profile is complete with photos and detailed information. Also check your match preferences - they might be too restrictive. Try expanding your age range or distance preferences."
    },
    {
      question: "How do I verify my profile?",
      answer: "Profile verification is available for Premium and VIP members. Go to Settings > Verification and follow the steps to submit your verification photo."
    },
    {
      question: "Can I change my location?",
      answer: "Yes! Update your location in Settings > Profile > Location. This will help you find matches in your current area."
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Help Center</h1>
            <p className="text-xl text-muted-foreground">
              Find answers or chat with PhilAI
            </p>
          </div>

          <Tabs defaultValue="faq" className="space-y-6">
            <TabsList className="grid grid-cols-2 glass w-full max-w-md mx-auto">
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                PhilAI Assistant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="space-y-6">
              <Card className="glass-card p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search for help..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass"
                  />
                </div>
              </Card>

              <Card className="glass-card p-6">
                <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border-border">
                      <AccordionTrigger className="text-left hover:text-primary">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredFaqs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No results found. Try a different search term.
                  </p>
                )}
              </Card>

              <Card className="glass-card p-6 text-center">
                <h3 className="font-semibold mb-2">Still need help?</h3>
                <p className="text-muted-foreground mb-4">
                  Our support team is here to assist you
                </p>
                <a href="/contact" className="text-primary hover:underline">
                  Contact Support →
                </a>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <PhilAIChat />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Help;
