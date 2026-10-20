import { Response } from 'express';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';
import { Invoice } from '../models/Invoice';
import { Clinic } from '../models/Clinic';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from '../middleware/auth';

export const getPlatformStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalClinics,
      revenueAgg,
      recentUsers,
      recentAppointments,
    ] = await Promise.all([
      User.countDocuments(),
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments(),
      Clinic.countDocuments(),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
      Appointment.find().sort({ createdAt: -1 }).limit(5).populate('patientId', 'firstName lastName').populate('doctorId', 'name specialty'),
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalClinics,
        totalRevenue,
        recentUsers,
        recentAppointments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform statistics', error: error.message });
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const action = req.query.action as string;
    const resource = req.query.resource as string;

    const query: any = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const search = req.query.search as string;

    const query: any = {};
    if (role && role !== 'all') query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account is now ${user.isActive ? 'active' : 'deactivated'}.`,
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to toggle status', error: error.message });
  }
};

export const getClinics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clinics = await Clinic.find().sort({ name: 1 });
    res.json({ success: true, data: clinics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch clinics', error: error.message });
  }
};
