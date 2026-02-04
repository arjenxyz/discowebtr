'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { LuMail, LuMessageSquare, LuExternalLink, LuArrowLeft } from 'react-icons/lu';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <LuMail className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Mesajınız Gönderildi!</h1>
              <p className="mt-2 text-gray-400">
                En kısa sürede size geri dönüş yapacağız.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <LuArrowLeft className="h-4 w-4" />
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <LuArrowLeft className="h-4 w-4" />
            Ana Sayfa
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">İletişim</h1>
          <p className="text-xl text-gray-400">
            Sorularınız ve önerileriniz için bize ulaşın
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div className="bg-[#1a1d23] rounded-lg p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Bize Yazın</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-[#0b0d12] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Adınız ve soyadınız"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-[#0b0d12] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="email@ornek.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Konu
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-[#0b0d12] border border-white/10 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Konu seçin</option>
                  <option value="technical">Teknik Destek</option>
                  <option value="feature">Özellik İsteği</option>
                  <option value="bug">Hata Bildirimi</option>
                  <option value="partnership">İş Birliği</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Mesaj
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-[#0b0d12] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Mesajınızı buraya yazın..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-[#1a1d23] rounded-lg p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Hızlı Destek</h3>
              <p className="text-gray-300 mb-6">
                Acil sorularınız için Discord sunucumuzdan anında yardım alın.
              </p>
              <a
                href={siteConfig.links?.support}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
              >
                <LuMessageSquare className="h-4 w-4" />
                Discord Destek
                <LuExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="bg-[#1a1d23] rounded-lg p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Dokümantasyon</h3>
              <p className="text-gray-300 mb-6">
                Detaylı kullanım kılavuzu ve API dokümantasyonu.
              </p>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                <LuMessageSquare className="h-4 w-4" />
                Dokümantasyon
              </Link>
            </div>

            <div className="bg-[#1a1d23] rounded-lg p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Yardım Konuları</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-400"></div>
                  <div>
                    <div className="font-medium text-white">Kurulum ve Yapılandırma</div>
                    <div className="text-sm">Bot kurulumu ve ayarları</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-400"></div>
                  <div>
                    <div className="font-medium text-white">Özellikler ve Kullanım</div>
                    <div className="text-sm">Sistem özelliklerinin kullanımı</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-yellow-400"></div>
                  <div>
                    <div className="font-medium text-white">Sorun Giderme</div>
                    <div className="text-sm">Sık karşılaşılan sorunlar</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-purple-400"></div>
                  <div>
                    <div className="font-medium text-white">API ve Entegrasyon</div>
                    <div className="text-sm">Harici sistem entegrasyonları</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}