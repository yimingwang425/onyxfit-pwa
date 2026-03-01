import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonList, IonListHeader, IonItem, IonLabel,
  IonButton, IonIcon, IonText, IonSpinner
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  informationCircleOutline, waterOutline, sparklesOutline,
  happyOutline, barChartOutline, fitnessOutline,
  trendingUpOutline, analyticsOutline, scaleOutline, addOutline
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonList, IonListHeader, IonItem, IonLabel,
    IonButton, IonIcon, IonText, IonSpinner
  ],
})
export class Tab1Page {
  @ViewChild('sparklineCanvas') private sparklineCanvas: ElementRef | undefined;

  private mlUrl = (environment as any).mlUrl || 'http://localhost:5001';

  username = 'User';
  greeting = 'Hello';
  aiTip = '';
  progressData = { completed: 0, total: 0 };
  currentMood: string | null = null;
  currentWater = 0;

  moodEmoji = '';
  weightHistory: { date: string; weight: number }[] = [];
  currentWeight = '';
  waterDots = new Array(8);

  private moodEmojiMap: Record<string, string> = {
    'Energetic': '⚡',
    'Neutral': '😊',
    'Tired': '😴',
    'Stressed': '😰',
  };

  private fallbackTips = [
    'Consistency beats intensity. Show up today and your future self will thank you.',
    'Hydration fuels performance. Aim for at least 8 glasses of water today.',
    'Recovery is where growth happens. Listen to your body and rest when needed.',
  ];

  constructor(
    private alertCtrl: AlertController,
    private http: HttpClient
  ) {
    addIcons({
      informationCircleOutline, waterOutline, happyOutline,
      sparklesOutline, barChartOutline, fitnessOutline,
      trendingUpOutline, analyticsOutline, scaleOutline,
      'add': addOutline
    });
  }

  ionViewWillEnter() {
    this.loadDashboardData();
  }

  ionViewDidEnter() {
    this.drawSparkline();
  }

  ionViewWillLeave() { }

  loadDashboardData() {
    const email = localStorage.getItem('registered_email');
    this.username = email ? email.split('@')[0] : 'User';

    this.setGreeting();
    this.checkAndResetDailyData();
    this.loadProgressFromAIPlan();
    this.loadWeightHistory();
    this.loadAIInsight();

    if (this.currentMood) {
      this.moodEmoji = this.moodEmojiMap[this.currentMood] || '';
    }

    setTimeout(() => this.drawSparkline(), 0);
  }

  private loadWeightHistory() {
    let history: { date: string; weight: number }[] = [];
    try {
      const raw = localStorage.getItem('weight_history');
      if (raw) history = JSON.parse(raw);
    } catch { }

    try {
      const profileStr = localStorage.getItem('user_profile');
      const planStr = localStorage.getItem('current_ai_plan');
      let weight: number | null = null;

      if (profileStr) {
        const p = JSON.parse(profileStr);
        weight = parseFloat(p.weightKg || p.weight);
      }
      if (!weight && planStr) {
        const plan = JSON.parse(planStr);
        weight = parseFloat(plan.weightKg);
      }

      if (weight && !isNaN(weight)) {
        const today = new Date().toISOString().split('T')[0];
        const exists = history.find(h => h.date === today);
        if (!exists) {
          history.push({ date: today, weight });
          if (history.length > 14) history = history.slice(-14);
          localStorage.setItem('weight_history', JSON.stringify(history));
        }
      }
    } catch { }

    this.weightHistory = history;
    if (history.length > 0) {
      this.currentWeight = history[history.length - 1].weight.toFixed(1);
    }
  }

  private drawSparkline() {
    if (!this.sparklineCanvas || this.weightHistory.length < 1) return;

    const canvas = this.sparklineCanvas.nativeElement as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const weights = this.weightHistory.map(e => e.weight);

    if (weights.length === 1) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      return;
    }

    const min = Math.min(...weights) - 0.5;
    const max = Math.max(...weights) + 0.5;
    const range = max - min || 1;
    const pad = 4;

    const points = weights.map((v, i) => ({
      x: pad + (i / (weights.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cp = {
        x: (points[i - 1].x + points[i].x) / 2,
        y1: points[i - 1].y,
        y2: points[i].y
      };
      ctx.bezierCurveTo(cp.x, cp.y1, cp.x, cp.y2, points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cp = {
        x: (points[i - 1].x + points[i].x) / 2,
        y1: points[i - 1].y,
        y2: points[i].y
      };
      ctx.bezierCurveTo(cp.x, cp.y1, cp.x, cp.y2, points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  private checkAndResetDailyData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastLogDate = localStorage.getItem('last_log_date');

    if (lastLogDate !== todayStr) {
      localStorage.removeItem('today_mood');
      localStorage.removeItem('today_water');
      localStorage.setItem('last_log_date', todayStr);
      this.currentMood = null;
      this.currentWater = 0;
    } else {
      this.currentMood = localStorage.getItem('today_mood');
      this.currentWater = parseInt(localStorage.getItem('today_water') || '0', 10);
    }
    this.moodEmoji = this.currentMood ? (this.moodEmojiMap[this.currentMood] || '') : '';
  }

  private setGreeting() {
    const currentHour = new Date().getHours();
    if (currentHour < 12) this.greeting = 'Good Morning';
    else if (currentHour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  private loadProgressFromAIPlan() {
    const planStr = localStorage.getItem('current_ai_plan');
    if (!planStr) { this.progressData = { completed: 0, total: 0 }; return; }

    try {
      const plan = JSON.parse(planStr);
      const workoutType = plan.workoutType || 'FBW';
      const schedules: Record<string, boolean[]> = {
        'PPL':         [false, true, true, true, true, true, false],
        'UPPER_LOWER': [false, true, true, false, true, true, false],
        'FBW':         [false, true, false, true, false, true, false],
      };
      const schedule = schedules[workoutType] || schedules['FBW'];
      const total = schedule.filter(d => d).length;
      const today = new Date().getDay();
      let completed = 0;
      for (let i = 1; i < today; i++) { if (schedule[i]) completed++; }
      this.progressData = { completed, total };
    } catch { this.progressData = { completed: 0, total: 0 }; }
  }

  private loadAIInsight() {
    this.aiTip = this.fallbackTips[Math.floor(Math.random() * this.fallbackTips.length)];

    const planStr = localStorage.getItem('current_ai_plan');
    let context: any = { mood: this.currentMood || 'Not logged', water: this.currentWater };

    if (planStr) {
      try {
        const plan = JSON.parse(planStr);
        context.calories = plan.caloriesKcal;
        context.workoutType = plan.workoutType;
        const schedules: Record<string, string[]> = {
          'PPL':         ['Rest','Push Day','Pull Day','Leg Day','Push Day','Pull Day','Rest'],
          'UPPER_LOWER': ['Rest','Upper Body','Lower Body','Rest','Upper Body','Lower Body','Rest'],
          'FBW':         ['Rest','Full Body','Rest','Full Body','Rest','Full Body','Rest'],
        };
        const todaySchedule = schedules[plan.workoutType] || schedules['FBW'];
        context.workout = todaySchedule[new Date().getDay()];
      } catch { }
    }

    this.http.post<{ insight: string }>(`${this.mlUrl}/api/insight`, context)
      .subscribe({
        next: (res) => { if (res.insight) this.aiTip = res.insight; },
        error: () => { }
      });
  }

  async logMood() {
    const alert = await this.alertCtrl.create({
      header: 'How are you feeling?',
      inputs: [
        { type: 'radio', label: '⚡ Energetic', value: 'Energetic' },
        { type: 'radio', label: '😊 Neutral', value: 'Neutral' },
        { type: 'radio', label: '😴 Tired', value: 'Tired' },
        { type: 'radio', label: '😰 Stressed', value: 'Stressed' },
      ],
      buttons: [
        { text: 'Cancel' },
        {
          text: 'Save',
          handler: (data: string) => {
            if (data) {
              this.currentMood = data;
              this.moodEmoji = this.moodEmojiMap[data] || '';
              localStorage.setItem('today_mood', data);
              localStorage.setItem('last_log_date', new Date().toISOString().split('T')[0]);
              this.saveMoodToBackend(data);
              this.loadAIInsight();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async logWater() {
    const alert = await this.alertCtrl.create({
      header: 'Log Water Intake',
      message: 'How many glasses are you adding?',
      inputs: [{ name: 'water', type: 'number', min: 1, value: 1 }],
      buttons: [
        { text: 'Cancel' },
        {
          text: 'Add',
          handler: (data: { water: string }) => {
            const glasses = parseInt(data.water, 10);
            if (glasses > 0) {
              this.currentWater += glasses;
              localStorage.setItem('today_water', this.currentWater.toString());
              localStorage.setItem('last_log_date', new Date().toISOString().split('T')[0]);
              this.saveWaterToBackend(this.currentWater);
              this.loadAIInsight();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private saveMoodToBackend(mood: string) {
    console.log('TODO: POST /api/progress/mood', { date: new Date().toISOString().split('T')[0], mood });
  }

  private saveWaterToBackend(totalGlasses: number) {
    console.log('TODO: POST /api/progress/water', { date: new Date().toISOString().split('T')[0], glasses: totalGlasses });
  }
}