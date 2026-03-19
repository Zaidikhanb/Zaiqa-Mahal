const connectToDatabase = require('./utils/db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const employeesCollection = db.collection('employees');

    // Check if employees exist, if not, seed 20 employees
    const count = await employeesCollection.countDocuments();
    if (count === 0) {
      const employeeList = [];
      for (let i = 1; i <= 20; i++) {
        employeeList.push({
          employeeId: `EMP${i.toString().padStart(3, '0')}`,
          name: `Employee ${i}`,
          createdAt: new Date(),
        });
      }
      await employeesCollection.insertMany(employeeList);
    }

    const employees = await employeesCollection.find({}).toArray();
    res.status(200).json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
