"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Mail,
  ChevronDown,
  Globe,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import ReactSpeedometer, {
} from "react-d3-speedometer";
import styles from "@/styles/CybersecurityAssessmentForm.module.css";
import { translations } from '@/lib/translations';
import { questionsData, Question, domains } from '@/lib/questions';

const BOOK_APPOINTMENT_URL = "https://cal.com/linzy-rsm-saudi/esg-book-30min-call";
const ASSESSMENT_RESULTS_EMAIL = "ladhikari@rsmsaudi.com";

type Language = 'en' | 'fr' | 'ar';

function getTotalScoreFromAnswers(questions: Question[], answers: Record<string, string>): number {
  return questions.reduce((sum, q) => {
    const val = answers[q.id];
    const opt = q.options.find((o) => o.value === val);
    return sum + (opt?.points ?? 0);
  }, 0);
}

// Add this near the top of the file, before the component
const BLOCKED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
];

export const getResultText = (score: number, language: Language = 'en') => {
  const t = translations[language].resultTexts;
  // Carbon credit readiness: max 100 points
  if (score >= 85) return t.advanced;
  if (score >= 65) return t.solid;
  if (score >= 35) return t.basic;
  return t.urgent;
};

export function CybersecurityAssessmentForm() {
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    company: "",
    position: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [hasStartedAssessment, setHasStartedAssessment] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set(domains.map(d => d.id)));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState(false);
  const [consultationSuccess, setConsultationSuccess] = useState(false);
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const isRTL = currentLanguage === 'ar';

  const t = translations[currentLanguage];

  const formSchema = z.object({
    name: z.string().min(2, { 
      message: currentLanguage === 'fr' ? "Veuillez entrer un nom valide." : 
              currentLanguage === 'ar' ? "يرجى إدخال اسم صحيح." :
              "Please enter a valid name." 
    }),
    email: z.string().email(
      currentLanguage === 'fr' ? "Veuillez entrer une adresse email valide" :
      currentLanguage === 'ar' ? "يرجى إدخال بريد إلكتروني صحيح" :
      "Please enter a valid email address"
    ).refine((email) => {
      if (!email.includes("@")) return false;
      const [, domain] = email.split("@");
      return domain && !BLOCKED_EMAIL_DOMAINS.includes(domain.toLowerCase());
    }, currentLanguage === 'fr' ? "Veuillez utiliser votre email professionnel." :
       currentLanguage === 'ar' ? "يرجى استخدام بريدك الإلكتروني للعمل." :
       "Please use your business email address."),
    company: z.string().min(2, { 
      message: currentLanguage === 'fr' ? "Le nom de l'entreprise ne peut pas être vide." :
              currentLanguage === 'ar' ? "لا يمكن أن يكون اسم الشركة فارغاً." :
              "Company name cannot be empty." 
    }),
    position: z.string().min(2, { 
      message: currentLanguage === 'fr' ? "Veuillez entrer un poste valide." :
              currentLanguage === 'ar' ? "يرجى إدخال منصب صحيح." :
              "Please enter a valid position." 
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      position: "",
    },
    mode: "onSubmit"
  });

  useEffect(() => {
    form.trigger(); // Re-validate form with new language
  }, [currentLanguage, form]);

  useEffect(() => {
    if (isConsultationModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isConsultationModalOpen]);

  const consultationSchema = z.object({
    firstName: z.string().min(2, { message: "Please enter a valid first name." }),
    lastName: z.string().min(2, { message: "Please enter a valid last name." }),
    email: z.string().email("Please enter a valid email address."),
    phone: z
      .string()
      .min(7, { message: "Please enter a valid phone number." })
      .max(20, { message: "Phone number is too long." }),
  });

  const consultationForm = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const handlePersonalInfoSubmit = (values: z.infer<typeof formSchema>) => {
    setPersonalInfo(values);
    setCurrentQuestion(1); // Go straight to questions (domain selection removed)
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setFormErrors([]);
  };

  const handleNext = () => {
    if (currentQuestion === 0) {
      form.handleSubmit(handlePersonalInfoSubmit)();
    } else if (currentQuestion < questions.length) {
      if (!answers[questions[currentQuestion - 1].id]) {
        setFormErrors(["Please select an answer before proceeding."]);
        return;
      }
      setFormErrors([]);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
    }
  };

  const calculateScore = async () => {
    const totalScore = getTotalScoreFromAnswers(questions, answers);
    setScore(totalScore);
    setAnimatedScore(0); // Reset animated score

    // Animate the score
    const animationDuration = 1000; // 1 second
    const frameDuration = 1000 / 60; // 60 fps
    const totalFrames = Math.round(animationDuration / frameDuration);
    let frame = 0;
    const animate = () => {
      const progress = frame / totalFrames;
      setAnimatedScore(Math.floor(progress * totalScore));
      if (frame < totalFrames) {
        frame++;
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);

    // Prepare the data to be sent via API
    const assessmentData = {
      personalInfo: {
        name: personalInfo.name,
        email: personalInfo.email,
        company: personalInfo.company,
        position: personalInfo.position,
      },
      answers,
      score: totalScore,
    };

    // Send the data to the server
    try {
      const response = await fetch("/api/send-assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assessmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to send assessment results"
        );
      }

      const data = await response.json();
      console.log("Assessment results sent successfully:", data);
    } catch (error) {
      console.error("Error sending assessment results:", error);
    }
  };

  const progress = currentQuestion > 0 ? ((currentQuestion) / questions.length) * 100 : 0;

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // const getScoreColor = (score: number) => {
  //   if (score >= 85) return "text-green-500";
  //   if (score >= 65) return "text-yellow-500";
  //   if (score >= 35) return "text-orange-500";
  //   return "text-red-500";
  // };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    setIsLanguageDropdownOpen(false);
  };

  const handleConsultationSubmit = async (values: z.infer<typeof consultationSchema>) => {
    setConsultationError(null);
    setIsSubmittingConsultation(true);
    try {
      const response = await fetch("/api/book-consultation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          context: {
            personalInfo,
            score: score ?? animatedScore,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit consultation request.");
      }

      consultationForm.reset();
      setConsultationSuccess(true);
      setIsConsultationModalOpen(false);
    } catch (error) {
      console.error("Error submitting consultation form:", error);
      setConsultationError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmittingConsultation(false);
    }
  };

  useEffect(() => {
    const newQuestions = questionsData[currentLanguage];
    // Filter questions based on selected domains
    const filtered = newQuestions.filter(q => selectedDomains.has(q.domain));
    setQuestions(filtered);
  }, [currentLanguage, selectedDomains]);

  const renderLanguageSwitcher = (variant: "dark" | "light" = "dark") => (
    <div className="relative inline-block text-left">
                <button
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          variant === "dark"
            ? "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/60"
            : "bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 focus-visible:ring-[#00AEEF] focus-visible:ring-offset-white",
        )}
      >
        <Globe className="h-4 w-4" />
        <span>{currentLanguage.toUpperCase()}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isLanguageDropdownOpen && "rotate-180",
          )}
        />
                </button>
                {isLanguageDropdownOpen && (
        <div
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-36 rounded-lg bg-white shadow-lg ring-1 ring-black/10 z-50"
          role="menu"
        >
                      <button
            onClick={() => handleLanguageChange("en")}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        English
                      </button>
                      <button
            onClick={() => handleLanguageChange("fr")}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Français
                      </button>
                      <button
            onClick={() => handleLanguageChange("ar")}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        العربية
                      </button>
                  </div>
                )}
              </div>
  );

  if (currentQuestion === 0) {
    return (
      <div className={`min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
          <Image
            src="https://rsm-saudi.s3.us-east-2.amazonaws.com/RSM_Saudi_Linzy_2025_Frame.png"
            alt="Cybersecurity Assessment Tool Banner"
            width={1920}
            height={540}
            className="block w-full h-auto"
            priority
          />
        </section>
        {/* Mobile: Language dropdown below banner */}
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} px-4 md:hidden mt-4 mb-2`}>
          {renderLanguageSwitcher("light")}
        </div>
        <section className="relative pb-16">
          <div className="relative mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {!hasStartedAssessment ? (
              <Card className="rounded-3xl border-2 border-[#3F9C35] bg-white shadow-[0_25px_70px_rgba(2,48,89,0.12)]">
                  <CardHeader className="space-y-2 text-center relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
                    {/* Desktop: In card header */}
                    <div className="hidden md:block absolute top-4 right-4 rtl:right-auto rtl:left-4">
                      {renderLanguageSwitcher("light")}
          </div>
                    <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#1b3a57]">
                      {t.assessmentGuidance?.title ?? "Assessment Guidance"}
                    </CardTitle>
                  </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Instructions Section */}
                    <div className="border-b border-gray-200 pb-4 sm:pb-6">
                      <h3 className="text-base sm:text-lg font-semibold text-[#1b3a57] mb-3 sm:mb-4">{t.assessmentGuidance?.instructions ?? "Instructions"}</h3>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4 sm:mb-6">
                        {t.assessmentGuidance?.instructionsDescription ?? "This assessment consists of single-choice questions across five dimensions of your organisation's engagement with carbon credits in Saudi Arabia. Each question has predefined answer options that reflect different levels of maturity in market awareness, strategy, governance, and financial decision-making. Please select the option that best describes your organisation today so you receive an accurate view of your current readiness in the Kingdom's voluntary carbon market."}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 items-stretch">
                        {(t.assessmentGuidance as { dimensions?: Array<{ points: number; title: string; description: string }> })?.dimensions?.map((dim: { points: number; title: string; description: string }, i: number) => (
                          <div key={i} className={i === 4 ? "md:col-span-2 flex md:justify-center" : "flex"}>
                            <div className={`flex items-stretch gap-3 md:gap-4 px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4 bg-white rounded-lg border-l-4 border-[#00AEEF] border border-[#63666a] shadow-sm hover:shadow-md transition-shadow w-full min-h-[120px] ${i === 4 ? "md:max-w-[calc(50%-0.5rem)]" : ""}`}>
                              <div className="flex flex-col flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-semibold text-[#00AEEF] uppercase tracking-wide mb-2">Section {i + 1}</span>
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center">
                                  <div className="text-center">
                                    <span className="text-xl md:text-2xl font-bold text-[#00AEEF] block">{dim.points}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">pts</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 pt-1 min-w-0 flex flex-col justify-center">
                                <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                                  <strong className="text-[#1b3a57] font-semibold">{dim.title}</strong> – {dim.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 sm:p-4 bg-[#00AEEF]/5 rounded-lg border border-[#00AEEF]/20">
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {t.assessmentGuidance?.scoring ?? "Scoring: Your total score will be calculated by summing the points from all your answers. The assessment will provide you with a carbon-credit readiness level based on your total score."}
                        </p>
                      </div>
                    </div>
                    {/* Disclaimer Section */}
                    <div className="border-t border-gray-200 pt-4 sm:pt-6">
                      <h3 className="text-base sm:text-lg font-semibold text-[#1b3a57] mb-3 sm:mb-4">{t.assessmentGuidance?.disclaimer ?? "Disclaimer"}</h3>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                        {t.assessmentGuidance?.disclaimerText ?? "This assessment does not guarantee compliance with any current or future regulations, standards, or market rules related to carbon credits. It reflects your organisation's carbon-credit readiness only at the time of completion and solely on the basis of your responses. The results are intended for internal use to support strategy and decision-making and should not be treated as legal, financial, or technical advice. We are not liable for any losses, decisions, or actions taken based on the assessment outcomes."}
                      </p>
                    </div>
                    <Button
                      onClick={() => setHasStartedAssessment(true)}
                      className="w-full h-11 sm:h-12 rounded-full bg-[#00AEEF] text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#00AEEF]/30 transition-all hover:bg-[#0091cf] hover:shadow-xl"
                    >
                      {t.assessmentGuidance?.beginAssessment ?? "Begin Assessment"}
                    </Button>
                    <p className="text-[10px] sm:text-xs text-gray-600 text-center px-2">
                      {t.assessmentGuidance?.agreeToTerms ?? "By clicking \"Begin Assessment\", you agree to our"}{" "}
                      <a
                        href="https://www.rsm.global/saudiarabia/privacy-notice"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00AEEF] hover:underline"
                      >
                        {t.assessmentGuidance?.privacyPolicy ?? "privacy policy"}
                      </a>{" "}
                      {t.assessmentGuidance?.and ?? "and"}{" "}
                      <a
                        href="https://www.rsm.global/saudiarabia/terms-and-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00AEEF] hover:underline"
                      >
                        {t.assessmentGuidance?.termsAndConditions ?? "terms and conditions"}
                      </a>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl border-2 border-[#3F9C35] bg-white shadow-[0_25px_70px_rgba(2,48,89,0.12)]">
                  <CardHeader className="space-y-2 text-center relative px-6 pt-6 pb-4">
                    {/* Desktop: In card header */}
                    <div className="hidden md:block absolute top-4 right-4 rtl:right-auto rtl:left-4">
                      {renderLanguageSwitcher("light")}
                    </div>
                    <CardTitle className="text-2xl font-semibold text-[#1b3a57] sm:text-3xl">
                        {t.personalInfo}
                      </CardTitle>
                  <CardDescription className="text-base text-gray-500">
                        {t.pleaseProvide}
                      </CardDescription>
                    </CardHeader>
              <CardContent className="pt-2">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(handlePersonalInfoSubmit)}
                          className="space-y-6"
                        >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                            <FormLabel className="text-sm font-semibold text-[#1b3a57]">
                              {t.name} <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                placeholder={t.placeholders?.name ?? "Enter your name"}
                                      className={cn(
                                  "h-12 rounded-xl border-gray-200 bg-white text-base focus-visible:ring-2 focus-visible:ring-[#00AEEF]",
                                  form.formState.submitCount > 0 &&
                                    form.formState.errors.name &&
                                    "border-red-500 focus-visible:ring-red-500",
                                      )}
                                    />
                                  </FormControl>
                                  {form.formState.submitCount > 0 && <FormMessage />}
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                            <FormLabel className="text-sm font-semibold text-[#1b3a57]">
                              {t.businessEmail} <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                type="email"
                                placeholder={t.placeholders?.email ?? "your.email@company.com"}
                                      className={cn(
                                  "h-12 rounded-xl border-gray-200 bg-white text-base focus-visible:ring-2 focus-visible:ring-[#00AEEF]",
                                  form.formState.submitCount > 0 &&
                                    form.formState.errors.email &&
                                    "border-red-500 focus-visible:ring-red-500",
                                      )}
                                    />
                                  </FormControl>
                                  {form.formState.submitCount > 0 && <FormMessage />}
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="company"
                              render={({ field }) => (
                                <FormItem>
                            <FormLabel className="text-sm font-semibold text-[#1b3a57]">
                              {t.company} <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                placeholder={t.placeholders?.company ?? "Enter your company name"}
                                      className={cn(
                                  "h-12 rounded-xl border-gray-200 bg-white text-base focus-visible:ring-2 focus-visible:ring-[#00AEEF]",
                                  form.formState.submitCount > 0 &&
                                    form.formState.errors.company &&
                                    "border-red-500 focus-visible:ring-red-500",
                                      )}
                                    />
                                  </FormControl>
                                  {form.formState.submitCount > 0 && <FormMessage />}
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="position"
                              render={({ field }) => (
                                <FormItem>
                            <FormLabel className="text-sm font-semibold text-[#1b3a57]">
                              {t.position} <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                placeholder={t.placeholders?.position ?? "Enter your job title"}
                                      className={cn(
                                  "h-12 rounded-xl border-gray-200 bg-white text-base focus-visible:ring-2 focus-visible:ring-[#00AEEF]",
                                  form.formState.submitCount > 0 &&
                                    form.formState.errors.position &&
                                    "border-red-500 focus-visible:ring-red-500",
                                      )}
                                    />
                                  </FormControl>
                                  {form.formState.submitCount > 0 && <FormMessage />}
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button
                            type="submit"
                      className="flex h-12 w-full items-center justify-center rounded-full bg-[#00AEEF] text-base font-semibold text-white shadow-lg shadow-[#00AEEF]/30 transition-colors hover:bg-[#0091cf]"
                          >
                      {t.continueToQuestions ?? t.startAssessment}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
        <Image
          src="https://rsm-saudi.s3.us-east-2.amazonaws.com/RSM_Saudi_Linzy_2025_Frame.png"
          alt="Cybersecurity Assessment Tool Banner"
          width={1920}
          height={540}
          className="block w-full h-auto"
          priority
        />
      </section>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-2 py-10 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {score === null ? (
                <motion.div
                  key={`question-${currentQuestion}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="rounded-3xl border-0 bg-white/95 backdrop-blur shadow-[0_25px_70px_rgba(3,32,66,0.25)]">
                <CardHeader className="border-b border-gray-100 px-6 py-6 relative">
                  <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                    {renderLanguageSwitcher("light")}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00AEEF]">
                      {t.questionIndicator
                        ? t.questionIndicator
                            .replace("{current}", `${currentQuestion}`)
                            .replace("{total}", `${questions.length}`)
                        : `Question ${currentQuestion} of ${questions.length}`}
                    </span>
                    <CardTitle className="text-xl font-semibold leading-snug text-[#1b3a57] sm:text-2xl">
                      {questions[currentQuestion - 1].text}
                      </CardTitle>
                  </div>
                    </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="space-y-4">
                    {questions[currentQuestion - 1].options.map((option) => {
                              const id = `${questions[currentQuestion - 1].id}-${option.value}`;
                      const isSelected =
                        answers[questions[currentQuestion - 1].id] === option.value;
                              return (
                        <div key={option.value} className="flex">
                                  <input
                                    type="radio"
                                    id={id}
                                    name={questions[currentQuestion - 1].id}
                                    value={option.value}
                            checked={isSelected}
                                    onChange={() =>
                              handleAnswerChange(questions[currentQuestion - 1].id, option.value)
                                    }
                            className="sr-only"
                                    required
                                  />
                                  <Label
                                    htmlFor={id}
                                    className={cn(
                              "flex w-full items-center gap-4 rounded-2xl border border-gray-200/80 bg-white px-5 py-4 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-[#00AEEF] hover:shadow-lg focus:outline-none cursor-pointer",
                              isSelected &&
                                "border-[#00AEEF] bg-[#f0fbff] shadow-[0_12px_30px_rgba(0,145,207,0.22)]",
                            )}
                          >
                            <span
                                      className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300 transition-colors",
                                isSelected && "border-[#00AEEF] bg-[#00AEEF]",
                                      )}
                                    >
                                      <Check
                                        className={cn(
                                  "h-3.5 w-3.5 text-white transition-opacity",
                                  isSelected ? "opacity-100" : "opacity-0",
                                )}
                              />
                                    </span>
                            <span className="flex-1 text-left">{option.label}</span>
                                  </Label>
                                </div>
                              );
                    })}
                        </div>
                        {(() => {
                          const selectedValue = answers[questions[currentQuestion - 1].id];
                          const selectedOption = questions[currentQuestion - 1].options.find((o) => o.value === selectedValue) as { reportContext?: string } | undefined;
                          return selectedOption?.reportContext ? (
                            <div className="mt-4 rounded-xl border border-[#00AEEF]/30 bg-[#f0fbff]/80 px-4 py-4 text-sm text-gray-700 leading-relaxed">
                              <p className="font-semibold text-[#1b3a57] mb-1.5">Option context</p>
                              <p className="text-left">{selectedOption.reportContext}</p>
                            </div>
                          ) : null;
                        })()}
                        {formErrors.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                          >
                            {formErrors.map((error, index) => (
                              <p key={index}>{error}</p>
                            ))}
                          </motion.div>
                        )}
                    </CardContent>
                <CardFooter className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-between">
                      <Button
                        onClick={handleBack}
                        disabled={currentQuestion === 1}
                    className="h-11 w-full rounded-full border border-gray-200 bg-white text-sm font-semibold text-[#1b3a57] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[200px]"
                      >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                        {t.back}
                      </Button>
                      <Button
                        onClick={handleNext}
                    className="h-11 w-full rounded-full bg-[#00AEEF] text-sm font-semibold text-white shadow-lg shadow-[#00AEEF]/30 transition-colors hover:bg-[#0091cf] sm:w-[220px]"
                  >
                    {currentQuestion === questions.length ? t.finish : t.next}
                    <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
              initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="rounded-3xl border-0 bg-white/95 backdrop-blur shadow-[0_25px_70px_rgba(3,32,66,0.25)]">
                <CardHeader className="px-6 py-6 text-center">
                  <CardTitle className="text-3xl font-semibold text-[#1b3a57]">
                    {t.assessmentResults}
                      </CardTitle>
                    </CardHeader>
                <CardContent className={cn(styles.resultContainer, "px-6 pb-10 pt-2")}>
                      <div className={styles.gaugeContainer}>
                        <ReactSpeedometer
                          value={animatedScore}
                          minValue={0}
                          maxValue={100}
                          segments={4}
                      segmentColors={["#ef4444", "#f97316", "#eab308", "#22c55e"]}
                          currentValueText={`${Math.round(animatedScore)}%`}
                          valueTextFontSize="38px"
                          textColor="#1E293B"
                          paddingHorizontal={30}
                          paddingVertical={30}
                          valueTextFontWeight="600"
                          needleTransitionDuration={4000}
                          needleColor="#1E293B"
                          startColor="#ef4444"
                          endColor="#22c55e"
                          labelFontSize="14px"
                          customSegmentLabels={[
                            {
                              text: t.speedometer.critical,
                              position: "INSIDE",
                              color: "#64748b",
                              fontSize: "12px",
                            },
                            {
                              text: t.speedometer.poor,
                              position: "INSIDE",
                              color: "#64748b",
                              fontSize: "12px",
                            },
                            {
                              text: t.speedometer.fair,
                              position: "INSIDE",
                              color: "#64748b",
                              fontSize: "12px",
                            },
                            {
                              text: t.speedometer.good,
                              position: "INSIDE",
                              color: "#64748b",
                              fontSize: "12px",
                            },
                          ]}
                          ringWidth={47}
                          needleHeightRatio={0.7}
                          customSegmentStops={[0, 35, 65, 85, 100]}
                        />
                      </div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6 w-full"
                      >
                        <Button
                          type="button"
                          className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-transparent bg-[#00AEEF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#00AEEF]/30 transition-all hover:bg-[#0091cf] hover:shadow-xl"
                          onClick={() => {
                            setConsultationSuccess(false);
                            setConsultationError(null);
                            setIsConsultationModalOpen(true);
                          }}
                        >
                          <Mail className="h-5 w-5" />
                          <span className="whitespace-nowrap">{t.bookAppointment}</span>
                        </Button>
                        <Button
                      className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-transparent bg-[#00AEEF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#00AEEF]/30 transition-all hover:bg-[#0091cf] hover:shadow-xl"
                          onClick={async () => {
                            try {
                              const response = await fetch("/api/generate-pdf", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                              personalInfo: {
                                name: personalInfo.name,
                                email: personalInfo.email,
                                company: personalInfo.company,
                                position: personalInfo.position,
                              },
                                  score: score || 0,
                                  answers,
                                  questions: questions,
                                  language: currentLanguage,
                                }),
                              });

                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || "Failed to generate PDF");
                              }

                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `${personalInfo.company}_Cyber_Self_Assessment_Report.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } catch (error: unknown) {
                              console.error("Error generating PDF:", error);
                              if (error instanceof Error) {
                                alert(`${t.errors.pdfGeneration}: ${error.message}`);
                              } else {
                                alert(t.errors.unknown);
                              }
                            }
                          }}
                        >
                          <svg
                        className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            ></path>
                          </svg>
                          <span className="whitespace-nowrap">{t.downloadReport}</span>
                        </Button>
                      </motion.div>

                      {!isConsultationModalOpen && consultationSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 rounded-2xl border border-[#3F9C35]/30 bg-gradient-to-r from-[#f0fbf4] to-[#e6f5ed] px-6 py-5 text-center text-[#1b3a57]"
                        >
                          <p className="text-lg font-semibold text-[#1b3a57]">
                            Thank you for reaching out! 🎉
                          </p>
                          <p className="mt-2 text-sm text-gray-700">
                            Our consulting team has received your request and will get back to you
                            shortly with available consultation slots. A confirmation email is on its
                            way to your inbox.
                          </p>
                        </motion.div>
                      )}

                  <motion.p
                    className={cn(styles.resultText, "relative z-0 mt-6")}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {getResultText(animatedScore, currentLanguage)}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    className="mt-8 rounded-xl border border-[#002E5D]/15 bg-[#f8fafc] px-5 py-4 text-center"
                  >
                    <p className="text-sm leading-relaxed text-[#334155]">
                      {t.resultConsultation?.prefix}
                      <a
                        href={BOOK_APPOINTMENT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#002E5D] underline decoration-[#002E5D]/40 underline-offset-2 transition hover:decoration-[#002E5D]"
                      >
                        {t.resultConsultation?.linkText}
                      </a>
                      {t.resultConsultation?.middle}
                      <a
                        href={`mailto:${t.resultConsultationEmail ?? ASSESSMENT_RESULTS_EMAIL}`}
                        className="font-semibold text-[#002E5D] underline decoration-[#002E5D]/40 underline-offset-2 transition hover:decoration-[#002E5D]"
                      >
                        {t.resultConsultationEmail ?? ASSESSMENT_RESULTS_EMAIL}
                      </a>
                    </p>
                  </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            {score === null && (
              <motion.div
            className="rounded-3xl border border-[#3F9C35]/30 bg-white/80 px-6 py-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
              >
            <div className="relative h-2 overflow-hidden rounded-full bg-[#EAF6FB]">
                  <motion.div
                className="absolute left-0 top-0 h-full rounded-full bg-[#009CD9]"
                    style={{ width: `${progress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6 }}
              />
                </div>
              </motion.div>
            )}
      </div>
      <AnimatePresence>
        {isConsultationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4 py-8"
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <Card className="border border-[#00AEEF]/20 bg-white shadow-[0_25px_70px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh]">
                <CardHeader className="px-6 pt-6 pb-2 text-center relative flex-shrink-0">
                  <button
                    onClick={() => {
                      setIsConsultationModalOpen(false);
                      setConsultationError(null);
                    }}
                    className="absolute right-4 top-4 rounded-full border border-gray-200 bg-white p-1 text-gray-500 transition hover:text-gray-800"
                    aria-label="Close booking modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl font-semibold text-[#1b3a57]">
                    <UserRound className="h-6 w-6 text-[#00AEEF]" />
                    Book an Appointment
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Schedule a 30-minute ESG call with our team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 flex-1 min-h-0 flex flex-col">
                  <iframe
                    src={BOOK_APPOINTMENT_URL}
                    title="Book an appointment"
                    className="w-full flex-1 min-h-[70vh] rounded-xl border border-gray-200"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

