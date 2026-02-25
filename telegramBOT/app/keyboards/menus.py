from __future__ import annotations

from typing import Any

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import LocationOption


def location_keyboard(locations: list[LocationOption], callback_prefix: str = "findloc") -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for location in locations:
        builder.button(text=location.name, callback_data=f"{callback_prefix}:{location.id}")
    builder.adjust(2)
    return builder.as_markup()


def floor_keyboard(floors: list[int]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for floor in floors:
        builder.button(text=f"{floor} этаж", callback_data=f"findfloor:{floor}")
    builder.button(text="Не важно", callback_data="findfloor:any")
    builder.adjust(3)
    return builder.as_markup()


def result_actions_keyboard(free_rooms: list[dict[str, Any]]) -> InlineKeyboardMarkup:
    # After booking, no action buttons are shown
    builder = InlineKeyboardBuilder()
    return builder.as_markup()


def booking_info_keyboard() -> InlineKeyboardMarkup:
    """Keyboard shown with active booking info."""
    builder = InlineKeyboardBuilder()
    builder.button(text="❌ Отменить бронь", callback_data="cancel_booking")
    builder.adjust(1)
    return builder.as_markup()


def set_default_location_keyboard(locations: list[LocationOption]) -> InlineKeyboardMarkup:
    return location_keyboard(locations, callback_prefix="setdef")

