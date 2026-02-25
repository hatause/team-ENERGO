from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.filters.command import CommandObject
from aiogram.types import CallbackQuery, Message

from app.config import Settings
from app.keyboards.menus import set_default_location_keyboard
from app.storage.user_storage import UserStorage


router = Router()


@router.message(Command("start"))
async def cmd_start(message: Message, settings: Settings) -> None:
    locations = ", ".join(location.name for location in settings.locations_list) or "не заданы"
    text = (
        "<b>Бот бронирования кабинетов</b>\n"
        "Бот находит и бронирует свободный кабинет на 1 час.\n\n"
        "<b>Быстрый старт:</b>\n"
        "1. /find — забронировать кабинет\n"
        "2. /mybook — посмотреть текущую бронь\n"
        "3. /cancelbook — отменить бронь\n"
        "4. /help — все команды\n\n"
        f"<b>Доступные локации:</b> {locations}"
    )
    await message.answer(text)


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    text = (
        "<b>Команды</b>\n"
        "/start - приветствие\n"
        "/help - список команд\n"
        "/find - забронировать кабинет на 1 час\n"
        "/mybook - посмотреть текущую бронь\n"
        "/cancelbook - отменить бронь\n"
        "/setdefault [location_id] - сохранить локацию по умолчанию\n"
        "/status - health Java API (только админы)\n"
        "/logs [N] - последние N строк логов (только админы)\n"
        "/cancel - отменить текущий диалог\n\n"
        "<b>Как работает</b>\n"
        "1. /find → выберите локацию и этаж\n"
        "2. Бот найдёт свободный кабинет на сегодня (1 час)\n"
        "3. Пока бронь активна, новый запрос покажет текущую запись\n"
        "4. Отмените бронь кнопкой или командой /cancelbook\n\n"
        "<b>Кнопки после результата:</b>\n"
        "❌ Отменить бронь — освободить кабинет\n"
        "ℹ️ ... — детали кабинета"
    )
    await message.answer(text)


@router.message(Command("setdefault"))
async def cmd_setdefault(
    message: Message,
    command: CommandObject,
    settings: Settings,
    user_storage: UserStorage,
) -> None:
    args = (command.args or "").strip() if command else ""
    user_id = message.from_user.id if message.from_user else 0
    if not user_id:
        await message.answer("Не удалось определить пользователя.")
        return

    if args:
        location = settings.get_location(args)
        if location is None:
            await message.answer("Неизвестная локация. Используйте /setdefault без аргументов.")
            return
        await user_storage.set_default_location(user_id, location.id)
        await message.answer(f"Локация по умолчанию сохранена: <b>{location.name}</b> ({location.id}).")
        return

    if not settings.locations_list:
        await message.answer("Список локаций не настроен в переменной LOCATIONS_LIST.")
        return

    await message.answer(
        "Выберите локацию по умолчанию:",
        reply_markup=set_default_location_keyboard(settings.locations_list),
    )


@router.callback_query(F.data.startswith("setdef:"))
async def callback_setdefault(
    callback: CallbackQuery,
    settings: Settings,
    user_storage: UserStorage,
) -> None:
    user_id = callback.from_user.id
    location_id = callback.data.split(":", maxsplit=1)[1]
    location = settings.get_location(location_id)
    if location is None:
        await callback.answer("Неизвестная локация.", show_alert=True)
        return
    await user_storage.set_default_location(user_id, location.id)
    await callback.answer("Сохранено.")
    if callback.message:
        await callback.message.answer(f"Локация по умолчанию: <b>{location.name}</b>.")

