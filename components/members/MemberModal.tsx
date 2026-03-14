"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select } from "@/components/ui/FormField";
import { saveMember } from "@/lib/actions/members";
import type { Member, MemberFormData } from "@/lib/types";

const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
};

const schema = z.object({
  name: z.string().min(1, "Member name is required"),
  guardianName: z.string().min(1, "Guardian name is required"),
  phone: z.string().min(1, "Guardian phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  expiryDate: z.string().min(1, "Expiry date is required"),
  status: z.enum(["active", "expired", "blocked"]),
});

interface MemberModalProps {
  open: boolean;
  onClose: () => void;
  member?: Member | null;
  onSaved: () => void;
}

export function MemberModal({ open, onClose, member, onSaved }: MemberModalProps) {
  const isNew = !member;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      guardianName: "",
      phone: "",
      email: "",
      expiryDate: oneYearFromNow(),
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      reset(
        member
          ? {
            id: member.id,
            name: member.name,
            guardianName: member.guardianName,
            phone: member.phone,
            email: member.email ?? "",
            // member.expiryDate is a JS Date from Drizzle
            expiryDate: new Date(member.expiryDate).toISOString().split("T")[0],
            status: member.status,
          }
          : {
            name: "",
            guardianName: "",
            phone: "",
            email: "",
            expiryDate: oneYearFromNow(),
            status: "active",
          }
      );
    }
  }, [open, member, reset]);

  const onSubmit = async (data: MemberFormData) => {
    setSubmitError(null);
    try {
      await saveMember(
        {
          ...(isNew ? {} : { id: member!.id }),
          name: data.name,
          guardianName: data.guardianName,
          phone: data.phone,
          email: data.email || undefined,
          expiryDate: new Date(data.expiryDate),
          status: data.status,
        },
        isNew
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? "Unknown error";
      setSubmitError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add Member" : "Edit Member"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" form="member-form" loading={isSubmitting}>
            {isNew ? "Add Member" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="member-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Member name + Status */}
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper label="Member Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} placeholder="Aisha Khan" error={!!errors.name} />
          </FieldWrapper>
          <FieldWrapper label="Status" htmlFor="status" required>
            <Select id="status" {...register("status")}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="blocked">Blocked</option>
            </Select>
          </FieldWrapper>
        </div>

        {/* Guardian name */}
        <FieldWrapper label="Guardian Name" htmlFor="guardianName" required error={errors.guardianName?.message}>
          <Input id="guardianName" {...register("guardianName")} placeholder="Mohammed Khan" error={!!errors.guardianName} />
        </FieldWrapper>

        {/* Guardian contact */}
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper label="Guardian Phone" htmlFor="phone" required error={errors.phone?.message}>
            <Input id="phone" {...register("phone")} placeholder="+971 50 000 0000" error={!!errors.phone} />
          </FieldWrapper>
          <FieldWrapper label="Guardian Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="guardian@example.com"
              error={!!errors.email}
            />
          </FieldWrapper>
        </div>

        {/* Expiry date */}
        <FieldWrapper label="Expiry Date" htmlFor="expiryDate" required error={errors.expiryDate?.message}>
          <Input id="expiryDate" type="date" {...register("expiryDate")} error={!!errors.expiryDate} />
        </FieldWrapper>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 break-all">{submitError}</p>
        )}
      </form>
    </Modal>
  );
}
