# 🚀 RMS Demo Script: The Journey of a Grain of Rice

This script is written like a story. You can read this step-by-step during your demo to explain exactly how the whole system connects together in a way that anyone can understand!

---

## 🛑 Act 1: The Truck Arrives (Procurement)
*Goal: We are buying raw Paddy from a farmer and bringing it into the mill.*

**Step 1: Welcome to the Gate!**
* **Where to go:** Click on the **Gate Pass** module on the sidebar.
* **What to do:** Click **Create Request** (Inward). Enter the truck number and the farmer's name.
* **What happens:** The system gives the truck a digital ticket to enter the mill.

**Step 2: Weighing the Heavy Truck**
* **Where to go:** Click on the **Weighbridge** module.
* **What to do:** Find the truck in the list and record its **Gross Weight** (e.g., 25,000 kg). 
* **What happens:** The system remembers how heavy the full truck is.

**Step 3: Quality Check (Is the Paddy Good?)**
* **Where to go:** Click on the **Procurement** module.
* **What to do:** Select the truck and enter the Quality metrics (like Moisture 12%). 
* **What happens:** The system approves the paddy for purchase.

**Step 4: Weighing the Empty Truck**
* **Where to go:** Go back to the **Weighbridge** module.
* **What to do:** Record the **Tare Weight** (the empty truck, e.g., 5,000 kg).
* **The Magic Data Flow:** The system does the math: `25,000 kg (Full) - 5,000 kg (Empty) = 20,000 kg of pure Paddy`. 
* **Where does it show?** Go to the **Inventory** module. Boom! You will instantly see your Paddy stock increase by exactly 20,000 kg (20 MT).

---

## ⚙️ Act 2: Turning Paddy into Rice (Production & Yield)
*Goal: We are going to mill the raw Paddy and turn it into shiny white Rice.*

**Step 1: Start the Machines!**
* **Where to go:** Click on the **Production** module.
* **What to do:** Click **Start New Batch**. Tell the system: "I want to use 10 MT of Paddy from Godown A."
* **The Magic Data Flow:** The system instantly goes into your **Inventory** and subtracts 10 MT of Paddy so nobody else can use it.

**Step 2: The Magic Trick (Yield Calculation)**
* **Where to go:** Click on the **Yield Management** module.
* **What to do:** Open the Yield Calculator. Type in what came out of the machine (e.g., 6 MT of Head Rice, 2 MT of Broken Rice, 1 MT of Bran, 1 MT of Husk). Click **Save Calculation**.
* **The Magic Data Flow:** The system takes all that new Rice and By-products and instantly puts them onto your shelves!
* **Where does it show?** 
  1. Go to the **Inventory** module. Your Rice stock just went up! 
  2. Look at the **Yield Analytics** chart, you will see a new dot plotting how efficient this batch was.

---

## 🚚 Act 3: Shipping the Rice Away (Inter-Plant Transfer)
*Goal: Our other mill (Plant B) needs some of our new Rice. Let's send it to them!*

**Step 1: Pack the Truck**
* **Where to go:** Click on the **Transfer** module.
* **What to do:** Click **Create Request**. Choose "Send 5 MT of Rice to Plant B".
* **What happens:** The system creates a pending request. The manager clicks **Mark Dispatched**.
* **The Magic Data Flow:** The system takes 5 MT of Rice out of your **Inventory** and puts it in the **"In Transit"** bucket. It's on the highway now!

**Step 2: The Truck Arrives at Plant B**
* **Where to go:** Still in the **Transfer** module (Tracking Tab).
* **What to do:** Find the dispatched truck and click **Mark Delivered**.
* **The Magic Data Flow:** The 5 MT of Rice is taken out of "In Transit" and securely added to Plant B's actual **Inventory**.

---

### 🎉 The Grand Finale: The Dashboard
* **Where to go:** Click on the **Dashboard** (Home icon).
* **What to show:** Show them how *every single thing* we just did—the paddy coming in, the rice being milled, and the truck driving to Plant B—is automatically updating the beautiful charts on the dashboard in real-time without anyone having to type a single number twice!
