# Admin Panel and Prompt Chain Tool for Humor Flavor Management

## Project Overview

- **Project Title:** Admin Panel and Prompt Chain Tool for Humor Flavor Management
- **Total Points:** 100 points
- **Submission Requirements:** Latest commit-specific URLs for three Vercel apps:
  1. Caption creation/rating app
  2. Admin area app
  3. Prompt chain tool app

## Core Requirements

Students must:

1. Create a GitHub repository and new Vercel project(s).
2. Build a prompt chain tool that can:
   - Create, edit, and delete humor flavors
   - Create, edit, delete, and reorder humor flavor steps
   - Generate captions using the REST API (`api.almostcrackd.ai`) from Assignment 5
   - Test humor flavors by generating captions
   - Read captions produced by specific humor flavors
3. Implement admin interface features:
   - Dark/light/system default mode support
   - Access restricted to users with `profiles.is_superadmin == TRUE` or `profiles.is_matrix_admin == TRUE`

---

## Detailed Rubric

## 1) Admin System Functionality (45 pts)

> Note: The listed sub-criteria total 50 raw points; graders should normalize this category to 45 points.

### 1.1 Admin panel loads successfully (5 pts)
- Application loads from submitted Vercel URL with no deployment errors.

### 1.2 Authentication and authorization (10 pts)
- Admin area is gated behind Google login.
- Unauthenticated users cannot access admin routes.
- Access is correctly restricted to superadmin/matrix admin users.

### 1.3 Database functionality (10 pts)
- Admin pages display data from multiple tables/charts.

### 1.4 Data management (10 pts)
- CRUD actions function correctly (create, edit, delete where required).
- Changes persist after page refresh.

### 1.5 Image management (10 pts)
- Admin can create and manage images successfully.

### 1.6 Pagination (5 pts)
- No pagination errors.

## 2) Admin Interface Design and Usability (30 pts)

### 2.1 Layout and visual clarity (10 pts)
- Well-organized, readable interface.
- Clear tables, forms, and navigation.

### 2.2 Navigation and structure (10 pts)
- Different admin sections are easy to locate and understand.
- Logical grouping of database entities.

### 2.3 Data presentation (5 pts)
- Tables, lists, or dashboards present information clearly.

### 2.4 Responsiveness and stability (5 pts)
- Interface behaves reliably without visual bugs or broken layouts.

## 3) Assignment Completion Credit (20 pts)

- **Assignment 6: Admin Panel** (10 pts)
- **Assignment 7: Domain Model** (10 pts)

## 4) Creativity and Insight Bonus (MAX: 7 pts)

- Helpful data visualization or statistics dashboard (2 pts)
- Clever admin tools or workflow improvements (3 pts)
- Exceptionally useful, polished, insightful, or pretty admin interface (2 pts)

## 5) Severe Penalties (Automatic Failure Conditions)

The following conditions result in automatic failure:

- Deployment protection enabled (-100 pts)
  - Vercel deployment protection must be turned off so pages are viewable in Incognito mode.
- Admin panel publicly accessible without authentication (-100 pts)
- Authentication wall missing or broken (-100 pts)
- Supabase RLS policies modified or disabled (-100 pts)
- Application does not allow admin capabilities (-100 pts)

---

## Technical Specifications

## Humor Flavor System

**Definition:** A humor flavor is a set of ordered steps that run in sequence to create captions from an input image.

### Example Workflow

1. Take an image and output a text description.
2. Take output from step 1 and generate something funny about it.
3. Take output from step 2 and generate five short, funny captions.

## Required Interface Capabilities

- Create/update/delete humor flavors
- Create/update/delete humor flavor steps
- Reorder humor flavor steps (for example, move step 2 to step 1)
- Read captions produced by specific humor flavors
- Support dark/light/system default modes
- Test humor flavors by generating captions using REST API

---

## Deliverables Checklist

- [ ] GitHub repository created
- [ ] Vercel project created
- [ ] Admin panel with authentication
- [ ] Prompt chain tool with humor flavor management
- [ ] Integration with `api.almostcrackd.ai`
- [ ] Three Vercel apps deployed
- [ ] Deployment protection disabled
- [ ] URLs submitted in "Submissions" section

---

## Submission Format (Required)

Submit all of the following:

1. Latest commit-specific URL for caption creation/rating app
2. Latest commit-specific URL for admin area app
3. Latest commit-specific URL for prompt chain tool app
4. GitHub repository URL
