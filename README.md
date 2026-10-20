# MiMi's Kitchen: Food-Cost & Profitability System

A prototype that shows a family-owned restaurant what each menu item costs to make and how much profit it earns, so rising ingredient prices don't quietly erode margins.

Built for Systems Analysis and Design at San José State University (Fall 2026). Team of 5.

## Problem

MiMi's Kitchen is a family-owned restaurant in San Jose. Through a written Q&A with the owners, we found their biggest issue was rising ingredient costs. Their Chowbus POS doesn't calculate ingredient cost per dish, so the owners couldn't see which menu items were actually profitable.

## Solution

A food-cost and profitability tool that runs alongside the existing POS instead of replacing it.

- Owners enter ingredients, quantities, and prices
- Each menu item is built from a recipe
- The system calculates total ingredient cost, profit in dollars, and profit margin per dish
- Updating an ingredient price recalculates every dish that uses it

The prototype covers 40+ menu items.

## Scope

**In scope:** ingredient and recipe management, per-item cost, profit, and margin calculation, owner-editable prices and menu items.

**Out of scope:** replacing the POS, accounting or payroll features, inventory and waste tracking, automated receipt import.

## Results

Presented to 5 judges and scored 42.4/50, the second-highest score. Strongest category was problem-solution fit (8.8/10).

## Next steps

Based on judge feedback:

- Automate data entry (receipt upload or CSV/POS import) to reduce manual input
- Add price history and trend tracking
- Model how ingredient price changes affect dish pricing
- Show a full end-to-end owner workflow in the demo

## Tech

Built in Replit.

## My role

Defined system requirements and scope (features, in/out of scope), wrote about half of the prototype code, and delivered the second demo.

## Team

Tom Lee, Tyler Posey, Sean Najar, Hena Patel, Josue Cornejo
