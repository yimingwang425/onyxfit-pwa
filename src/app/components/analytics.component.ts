import { Component, OnInit, OnDestroy, inject as ngInject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { inject } from '@vercel/analytics';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

/**
 * Analytics Component for Vercel Web Analytics
 * 
 * This component integrates Vercel Web Analytics with Angular routing,
 * automatically tracking page views on route changes.
 * 
 * Usage: Add <app-analytics></app-analytics> to your root component template
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  template: '', // Empty template - this component has no UI
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private routerSubscription?: Subscription;
  private router = ngInject(Router);

  ngOnInit(): void {
    // Initialize Vercel Analytics
    inject();

    // Track route changes for SPA navigation
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        // Analytics script automatically tracks page views
        // This subscription ensures the analytics is aware of route changes
        if (typeof window !== 'undefined' && (window as any).va) {
          (window as any).va('pageview', { path: event.urlAfterRedirects });
        }
      });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
