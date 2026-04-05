---
name: add-monetization
description: Add freemium model — free equations, paid personalization via Django backend on Namecheap (Sciencebouk)
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# ADD FREEMIUM MONETIZATION

The 17 equations are free forever. Django powers the paid personalization layer.
Deploy to existing Namecheap servers.

---

## PHASE 1: Auth & User Accounts (Django)

### 1.1 — User Model & Auth

In `backend/courses/` (or create `backend/accounts/` app):

- Extend Django's `AbstractUser` or use the default User with a `Profile` model:
  ```python
  class Profile(models.Model):
      user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
      tier = models.CharField(max_length=20, choices=[('free', 'Free'), ('pro', 'Pro')], default='free')
      stripe_customer_id = models.CharField(max_length=255, blank=True)
      stripe_subscription_id = models.CharField(max_length=255, blank=True)
      created_at = models.DateTimeField(auto_now_add=True)
      
      # Learning preferences
      daily_goal_minutes = models.IntegerField(default=10)
      preferred_difficulty = models.CharField(max_length=20, default='beginner')
      onboarding_completed = models.BooleanField(default=False)
  ```

- Auth via `djangorestframework-simplejwt`:
  - `POST /api/auth/register/` — email + password signup
  - `POST /api/auth/login/` — returns JWT access + refresh tokens
  - `POST /api/auth/refresh/` — refresh token
  - `GET /api/auth/me/` — current user profile
  - `POST /api/auth/google/` — Google OAuth (optional, later)

- Add to `requirements.txt`:
  ```
  djangorestframework-simplejwt==5.4.0
  ```

### 1.2 — Frontend Auth

Create `frontend/src/auth/`:

- `AuthContext.tsx` — React context with `user`, `login()`, `logout()`, `register()`, `isAuthenticated`, `isPro`
- `useAuth()` — hook to access auth context
- Store JWT in `localStorage` (access token) and handle refresh automatically
- `AuthModal.tsx` — slide-up modal for login/register (not a separate page — keep it seamless)
- `ProGate.tsx` — wrapper component that shows a "Go Pro" prompt when a free user hits a paid feature

**Key UX principle**: Never block the equations. Free users can do everything with the visualizations. The auth modal only appears when they try to use a Pro feature (sync, notes, analytics).

### 1.3 — API Client Update

Update `frontend/src/api/client.ts`:
- Attach JWT `Authorization: Bearer <token>` header to all requests when logged in
- Handle 401 → attempt refresh → redirect to login if refresh fails
- All equation endpoints stay public (no auth required)
- Progress/notes/analytics endpoints require auth

---

## PHASE 2: Progress Sync (The First Paid Feature)

### 2.1 — Backend

The `UserProgress` model already exists. Enhance it:

```python
class UserProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    equation = models.ForeignKey(Equation, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    lesson_step = models.CharField(max_length=50, blank=True)  # current step ID
    time_spent_seconds = models.IntegerField(default=0)
    variables_explored = models.JSONField(default=list)  # which vars they dragged
    notes = models.TextField(blank=True)
    bookmarked = models.BooleanField(default=False)
    last_viewed = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'equation']
```

New endpoints:
- `GET /api/progress/` — all progress for current user
- `PATCH /api/progress/{equation_id}/` — update progress (step, time, completion)
- `POST /api/progress/sync/` — bulk sync from localStorage (for when user signs up AFTER using the free app)
- `GET /api/progress/stats/` — aggregate stats (total time, completion %, streak)

### 2.2 — Frontend: Hybrid Progress System

This is critical for conversion. The app MUST work perfectly without an account:

```typescript
// frontend/src/progress/useProgress.ts

export function useProgress(equationId: number) {
  const { user, isPro } = useAuth()
  
  // Always read/write localStorage (works offline, works for free users)
  const [localProgress, setLocalProgress] = useLocalStorage(`eq-progress-${equationId}`)
  
  // If Pro user, also sync with server
  const serverProgress = useQuery({
    queryKey: ['progress', equationId],
    queryFn: () => api.progress.get(equationId),
    enabled: isPro && !!user,
  })
  
  // Merge: server wins on conflict (it has cross-device data)
  const progress = isPro && serverProgress.data 
    ? mergeProgress(localProgress, serverProgress.data)
    : localProgress
    
  const updateProgress = (update: ProgressUpdate) => {
    // Always update local
    setLocalProgress(prev => ({ ...prev, ...update }))
    // If Pro, also push to server (debounced)
    if (isPro) debouncedSync(equationId, update)
  }
  
  return { progress, updateProgress }
}
```

### 2.3 — Migration Prompt

When a free user has localStorage progress and signs up for Pro:
- Show: "We found your progress on 7 equations. Want to sync it to your account so it follows you everywhere?"
- One-click bulk upload via `POST /api/progress/sync/`
- This is a powerful conversion moment — they've invested time and want to keep it

---

## PHASE 3: Stripe Payments

### 3.1 — Backend: Stripe Integration

Add to `requirements.txt`:
```
stripe==12.2.0
```

Create `backend/payments/` app:

```python
# payments/views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create a Stripe Checkout session for Pro subscription."""
    profile = request.user.profile
    
    if not profile.stripe_customer_id:
        customer = stripe.Customer.create(email=request.user.email)
        profile.stripe_customer_id = customer.id
        profile.save()
    
    session = stripe.checkout.Session.create(
        customer=profile.stripe_customer_id,
        payment_method_types=['card'],
        line_items=[{
            'price': settings.STRIPE_PRO_PRICE_ID,  # Monthly or yearly
            'quantity': 1,
        }],
        mode='subscription',
        success_url=settings.FRONTEND_URL + '/pro/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url=settings.FRONTEND_URL + '/pro/cancel',
    )
    return Response({'url': session.url})


@api_view(['POST'])
def stripe_webhook(request):
    """Handle Stripe webhook events."""
    sig = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = stripe.Webhook.construct_event(
        request.body, sig, settings.STRIPE_WEBHOOK_SECRET
    )
    
    if event.type == 'checkout.session.completed':
        session = event.data.object
        customer_id = session.customer
        profile = Profile.objects.get(stripe_customer_id=customer_id)
        profile.tier = 'pro'
        profile.stripe_subscription_id = session.subscription
        profile.save()
    
    elif event.type == 'customer.subscription.deleted':
        sub = event.data.object
        profile = Profile.objects.get(stripe_subscription_id=sub.id)
        profile.tier = 'free'
        profile.stripe_subscription_id = ''
        profile.save()
    
    return Response({'received': True})
```

Endpoints:
- `POST /api/payments/checkout/` — create Stripe Checkout session
- `POST /api/payments/webhook/` — Stripe webhook handler
- `POST /api/payments/portal/` — create Stripe Customer Portal session (manage subscription)
- `GET /api/payments/status/` — current subscription status

### 3.2 — Pricing

Set up in Stripe Dashboard:
- **Pro Monthly**: $4.99/month (or local equivalent — affordable for students)
- **Pro Yearly**: $39.99/year (save 33% — highlight this)
- **Free trial**: 7 days of Pro (optional, good for conversion)

### 3.3 — Frontend: Upgrade Flow

Create `frontend/src/components/ProUpgrade.tsx`:

- **Soft prompts** (not blocking): When free user finishes an equation lesson, show a subtle card:
  > "Nice work on Pythagoras! Want to track your progress across devices? Go Pro."
  > [Maybe Later] [Go Pro — $4.99/mo]

- **Feature gates**: When free user taps "Notes" or "Bookmark":
  > "Notes sync across all your devices with Pro."
  > [Start Free Trial]

- **Pricing page** at `/pro`:
  - Side-by-side Free vs Pro comparison
  - Toggle monthly/yearly
  - Testimonial quotes (add later)
  - "Start 7-day free trial" CTA

- **Checkout**: Redirect to Stripe Checkout (hosted page — don't build custom payment form)

---

## PHASE 4: Learning Analytics (Pro Feature)

### 4.1 — Backend: Analytics Tracking

```python
class LearningEvent(models.Model):
    """Fine-grained tracking for learning analytics."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    equation = models.ForeignKey(Equation, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=50, choices=[
        ('lesson_started', 'Lesson Started'),
        ('lesson_step_completed', 'Lesson Step Completed'),
        ('lesson_completed', 'Lesson Completed'),
        ('variable_explored', 'Variable Explored'),
        ('aha_moment', 'Aha Moment Reached'),
        ('time_spent', 'Time Spent'),
    ])
    data = models.JSONField(default=dict)  # Flexible payload
    created_at = models.DateTimeField(auto_now_add=True)
```

Endpoints:
- `POST /api/analytics/event/` — log a learning event (batched, debounced from frontend)
- `GET /api/analytics/dashboard/` — personal learning dashboard data:
  ```json
  {
    "totalTimeMinutes": 47,
    "equationsCompleted": 5,
    "currentStreak": 3,
    "longestStreak": 7,
    "strongCategories": ["Physics", "Geometry"],
    "needsReview": ["Calculus", "Statistics"],
    "weeklyActivity": [12, 0, 8, 15, 0, 12, 0],
    "nextRecommended": { "id": 9, "title": "Fourier Transform", "reason": "You mastered waves — Fourier decomposes them" }
  }
  ```

### 4.2 — Frontend: Dashboard

Create `/dashboard` route (Pro only):

- **Streak counter** — GitHub-style contribution heatmap for daily practice
- **Progress ring** — 5/17 equations completed, with category breakdown
- **Time chart** — weekly minutes spent learning
- **Smart recommendation** — "Based on your progress, try Fourier Transform next — it builds on the Wave Equation you just completed"
- **Strengths & gaps** — which categories you're strong in, which need review
- **Notes collection** — all your bookmarked equations and notes in one place

---

## PHASE 5: Deployment on Namecheap

### 5.1 — Backend Deployment

Create deployment config for Namecheap shared/VPS hosting:

**If Namecheap VPS (recommended for Django):**

`docker-compose.prod.yml`:
```yaml
services:
  web:
    build: ./backend
    command: gunicorn formulas_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
    environment:
      - DJANGO_SETTINGS_MODULE=formulas_backend.settings
      - DJANGO_DEBUG=0
      - DJANGO_SECRET_KEY=${SECRET_KEY}
      - DJANGO_ALLOWED_HOSTS=${DOMAIN}
      - DJANGO_CORS_ALLOWED_ORIGINS=https://${DOMAIN}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_PRO_PRICE_ID=${STRIPE_PRO_PRICE_ID}
      - DATABASE_URL=postgres://formulas:${DB_PASSWORD}@db:5432/formulas
    depends_on:
      - db
    restart: always

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=formulas
      - POSTGRES_USER=formulas
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/dist:/usr/share/nginx/html
      - certbot-etc:/etc/letsencrypt
    depends_on:
      - web
    restart: always

volumes:
  pgdata:
  certbot-etc:
```

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "formulas_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend — static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Stripe webhooks
    location /api/payments/webhook/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header Stripe-Signature $http_stripe_signature;
    }
}
```

### 5.2 — Frontend Deployment

- `npm run build` → `frontend/dist/`
- Served by nginx as static files
- API calls go to `/api/` which nginx proxies to Django
- No separate frontend server needed

### 5.3 — Database: Switch to PostgreSQL

Update `backend/formulas_backend/settings.py` for production:
```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600,
    )
}
```

Add to `requirements.txt`:
```
dj-database-url==2.3.0
psycopg2-binary==2.9.10
gunicorn==23.0.0
```

### 5.4 — SSL

Use Let's Encrypt via certbot:
```bash
certbot --nginx -d yourdomain.com
```

### 5.5 — Environment Variables (`.env.production`)

```bash
SECRET_KEY=generate-a-real-secret-key
DOMAIN=sciencebouk.yourdomain.com
DB_PASSWORD=generate-a-real-password
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
FRONTEND_URL=https://formulas.yourdomain.com
```

---

## PHASE 6: Conversion Optimization

### Strategic free-to-pro nudges (non-annoying):

1. **After completing 3rd equation**: "You're on a roll! Pro users complete 3× more equations because progress syncs everywhere."

2. **After 7 days of use**: "You've spent 2 hours learning with Sciencebouk this week. Track your streak with Pro."

3. **When they revisit an equation**: "Welcome back to Gravity! With Pro, we'd remember exactly where you left off."

4. **After finishing all lessons for an equation**: Show a completion badge with a lock icon: "Share this achievement — unlock with Pro."

5. **Notes**: Every equation has a "My Notes" section. Free users see it but get: "Your notes stay on this device. Go Pro to sync them."

### What to NEVER do:
- Never block or blur the equations/visualizations
- Never interrupt a lesson in progress
- Never show a paywall before they've experienced value
- Never nag more than once per session
- Never make the free experience feel incomplete — it IS the product, Pro is the upgrade

---

## EXECUTION ORDER

1. Auth system (Django + JWT + frontend context) — this unblocks everything
2. Progress sync (localStorage + server merge) — the core Pro feature
3. Stripe integration (checkout + webhook + portal)
4. Pro upgrade UI (soft prompts, pricing page, feature gates)
5. Learning analytics (events, dashboard, recommendations)
6. Docker deployment config for Namecheap
7. SSL + domain setup

Each phase is independently valuable. Ship auth + progress sync first — that's enough to start charging.
