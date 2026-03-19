const connectToDatabase = require('./utils/db');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { db } = await connectToDatabase();
  const attendanceCollection = db.collection('attendance');
  const employeesCollection = db.collection('employees');

  // GET: Retrieve attendance records
  if (req.method === 'GET') {
    try {
      const { date, all } = req.query;

      let query = {};
      if (date) {
        // Match records for specific date (date string stored in YYYY-MM-DD)
        query.date = date;
      }

      let attendance;
      if (all === 'true') {
        // For admin: get all records with employee details
        attendance = await attendanceCollection.find({}).sort({ timestamp: -1 }).toArray();
      } else {
        attendance = await attendanceCollection.find(query).sort({ timestamp: -1 }).toArray();
      }

      // Enrich with employee names
      const employeeIds = attendance.map(a => a.employeeId);
      const employees = await employeesCollection.find({ _id: { $in: employeeIds } }).toArray();
      const employeeMap = {};
      employees.forEach(e => employeeMap[e._id] = e.name);

      const enriched = attendance.map(a => ({
        ...a,
        employeeName: employeeMap[a.employeeId] || 'Unknown',
      }));

      res.status(200).json(enriched);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST: Mark attendance
  else if (req.method === 'POST') {
    try {
      const { employeeId, timestamp } = req.body;

      if (!employeeId || !timestamp) {
        return res.status(400).json({ error: 'Missing employeeId or timestamp' });
      }

      // Validate employee exists
      const employee = await employeesCollection.findOne({ _id: employeeId });
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Extract date part (YYYY-MM-DD) from timestamp
      const date = timestamp.split('T')[0];

      // Check if already marked today
      const existing = await attendanceCollection.findOne({ employeeId, date });
      if (existing) {
        return res.status(400).json({ error: 'Attendance already marked for today' });
      }

      // Insert new attendance record
      const result = await attendanceCollection.insertOne({
        employeeId,
        timestamp: new Date(timestamp),
        date,
        status: 'present',
      });

      res.status(201).json({ 
        message: 'Attendance marked successfully',
        id: result.insertedId 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
